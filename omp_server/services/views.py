from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import (
    ListModelMixin, RetrieveModelMixin,
    CreateModelMixin
)
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter

from django_filters.rest_framework.backends import DjangoFilterBackend

from db_models.models import (
    Service, ApplicationHub
)
from services.tasks import exec_action
from services.services_filters import ServiceFilter
from services.services_serializers import (
    ServiceSerializer, ServiceDetailSerializer,
    ServiceActionSerializer, ServiceDeleteSerializer
)
from promemonitor.prometheus import Prometheus
from promemonitor.grafana_url import explain_url
from utils.common.exceptions import OperateError
from utils.common.paginations import PageNumberPager
import json
import logging

logger = logging.getLogger('server')


class ServiceListView(GenericViewSet, ListModelMixin):
    """
        list:
        查询服务列表
    """
    queryset = Service.objects.filter(
        service__is_base_env=False)
    serializer_class = ServiceSerializer
    pagination_class = PageNumberPager
    # 过滤，排序字段
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filter_class = ServiceFilter
    ordering_fields = ("ip", "service_instance_name")
    # 操作描述信息
    get_description = "查询服务列表"

    def list(self, request, *args, **kwargs):
        # 获取序列化数据列表
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(
            self.paginate_queryset(queryset), many=True)
        serializer_data = serializer.data

        # 如果服务为 base_env 服务，则修改状态为 '-'
        for service_obj in serializer_data:
            if service_obj.get("is_base_env"):
                service_obj["service_status"] = "-"

        # 实时获取服务动态git
        prometheus_obj = Prometheus()
        is_success, prometheus_dict = prometheus_obj.get_all_service_status()
        # 若获取成功，则动态覆盖服务状态
        if is_success:
            status_dict = {
                True: "正常",
                False: "停止",
                None: "未监控",
            }
            for service_obj in serializer_data:
                # 如果服务状态为 '正常' 和 '停止' 的服务，通过 Prometheus 动态更新
                if service_obj.get("service_status") in ("正常", "停止"):
                    key_name = f"{service_obj.get('ip')}_{service_obj.get('service_instance_name')}"
                    status = prometheus_dict.get(key_name, None)
                    service_obj["service_status"] = status_dict.get(status)

        # 获取监控及日志的url
        serializer_data = explain_url(
            serializer_data, is_service=True)
        return self.get_paginated_response(serializer_data)


class ServiceDetailView(GenericViewSet, RetrieveModelMixin):
    """
        read:
        查询服务详情
    """
    queryset = Service.objects.all()
    serializer_class = ServiceDetailSerializer
    # 操作描述信息
    get_description = "查询服务详情"


class ServiceActionView(GenericViewSet, CreateModelMixin):
    """
        create:
        服务启停删除
    """
    queryset = Service.objects.all()
    serializer_class = ServiceActionSerializer

    def create(self, request, *args, **kwargs):
        many_data = self.request.data.get('data')
        for data in many_data:
            action = data.get("action")
            instance = data.get("id")
            operation_user = data.get("operation_user")
            if action and instance and operation_user:
                exec_action.delay(action, instance, operation_user)
            else:
                raise OperateError("请输入action或id")
        return Response("执行成功")


class ServiceDeleteView(GenericViewSet, CreateModelMixin):
    """
        create:
        服务删除校验
    """
    queryset = Service.objects.all()
    serializer_class = ServiceDeleteSerializer

    def create(self, request, *args, **kwargs):
        """
        检查被依赖关系，包含多服务匹配
        例如 jdk-1.8和 test-app被同时标记删除
        test-app依赖jdk-1.8，同时标记则不显示依赖。单选jdk1.8则会显示。
        """
        many_data = self.request.data.get('data')
        service_objs = Service.objects.all()
        app_objs = ApplicationHub.objects.all()
        service_json = {}
        dependence_dict = []
        # 存在的service key
        for i in service_objs:
            service_key = f"{i.service.app_name}-{i.service.app_version}"
            service_json[i.id] = service_key
        # 全量app的dependence反向
        for app in app_objs:
            if app.app_dependence:
                for i in json.loads(app.app_dependence):
                    dependence_dict.append(
                        {f"{i.get('name')}-{i.get('version')}": f"{app.app_name}-{app.app_version}"}
                    )
        exist_service = set()
        # 过滤存在的实例所属app的key
        for data in many_data:
            instance = int(data.get("id"))
            filter_list = service_json.get(instance)
            exist_service.add(filter_list)
        # 查看存在的服务有没有被依赖的，做set去重
        res = set()
        for i in exist_service:
            for j in dependence_dict:
                if j.get(i):
                    res.add(j.get(i))
        res = res - exist_service
        # 查看是否需要被依赖的是否已不存在
        res = res & set(service_json.values())
        res = "存在依赖信息:" + ",".join(res) if res else "无依赖信息"
        return Response(res)
