import {
  OmpContentWrapper,
  OmpTable,
  OmpMessageModal,
  OmpSelect,
  OmpDrawer,
} from "@/components";
import { Button, message, Menu, Dropdown } from "antd";
import { useState, useEffect, useRef } from "react";
import { handleResponse, _idxInit, refreshTime } from "@/utils/utils";
import { fetchGet, fetchPost, fetchPatch } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import {
  AddMachineModal,
  UpDateMachineModal,
  BatchImportMachineModal,
} from "./config/modals";
import { useDispatch } from "react-redux";
import getColumnsConfig, { DetailHost } from "./config/columns";
import { DownOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";

const MachineManagement = () => {
  const location = useLocation();

  const history = useHistory();

  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);

  //添加弹框的控制state
  const [addModalVisible, setAddMoadlVisible] = useState(false);
  //修改弹框的控制state
  const [updateMoadlVisible, setUpdateMoadlVisible] = useState(false);

  // 批量导入弹框
  const [batchImport, setBatchImport] = useState(false);

  //选中的数据
  const [checkedList, setCheckedList] = useState({});

  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [ipListSource, setIpListSource] = useState([]);
  const [selectValue, setSelectValue] = useState(location.state?.ip);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });

  const [isShowDrawer, setIsShowDrawer] = useState({
    isOpen: false,
    src: "",
    record: {},
  });

  const [msgShow, setMsgShow] = useState(false);

  const msgRef = useRef(null);

  // 定义row存数据
  const [row, setRow] = useState({});

  // 主机详情历史数据
  const [historyData, setHistoryData] = useState([]);

  // 主机详情基础组件信息
  const [baseEnvData, setBaseEnvData] = useState([]);

  // 主机详情loading
  const [historyLoading, setHistoryLoading] = useState([]);

  // 重启主机agent
  const [restartHostAgentModal, setRestartHostAgentModal] = useState(false);

  // 重启监控agent
  const [restartMonterAgentModal, setRestartMonterAgentModal] = useState(false);

  // 开启维护
  const [openMaintainModal, setOpenMaintainModal] = useState(false);
  // 关闭维护
  const [closeMaintainModal, setCloseMaintainModal] = useState(false);

  // 开启维护（单次）
  const [openMaintainOneModal, setOpenMaintainOneModal] = useState(false);
  // 关闭维护（单次）
  const [closeMaintainOneModal, setCloseMaintainOneModal] = useState(false);

  const [showIframe, setShowIframe] = useState({});

  // 列表查询
  function fetchData(
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) {
    setLoading(true);
    fetchGet(apiRequest.machineManagement.hosts, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ordering: ordering ? ordering : null,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(res.data.results);
          setPagination({
            ...pagination,
            total: res.data.count,
            pageSize: pageParams.pageSize,
            current: pageParams.current,
            ordering: ordering,
            searchParams: searchParams,
          });
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        location.state = {};
        setLoading(false);
        fetchIPlist();
      });
  }

  const fetchIPlist = () => {
    setSearchLoading(true);
    fetchGet(apiRequest.machineManagement.ipList)
      .then((res) => {
        handleResponse(res, (res) => {
          setIpListSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setSearchLoading(false);
      });
  };

  const createHost = (data) => {
    setLoading(true);
    data.ip = data.IPtext;
    delete data.IPtext;
    data.port = `${data.port}`;
    fetchPost(apiRequest.machineManagement.hosts, {
      body: {
        ...data,
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success("添加主机成功");
            fetchData(
              { current: pagination.current, pageSize: pagination.pageSize },
              { ip: selectValue },
              pagination.ordering
            );
            setAddMoadlVisible(false);
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  const upDateHost = (data) => {
    setLoading(true);
    data.ip = data.IPtext;
    delete data.IPtext;
    data.port = `${data.port}`;
    fetchPatch(`${apiRequest.machineManagement.hosts}${row.id}/`, {
      body: {
        ...data,
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            // msgRef.current = res.data.message
            // setMsgShow(true)
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success("更新主机信息成功");
            fetchData(
              { current: pagination.current, pageSize: pagination.pageSize },
              { ip: selectValue },
              pagination.ordering
            );
            setUpdateMoadlVisible(false);
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // const fetchHistoryData = (id) => {
  //   setHistoryLoading(true);
  //   fetchGet(apiRequest.machineManagement.operateLog, {
  //     params: {
  //       host_id: id,
  //     },
  //   })
  //     .then((res) => {
  //       handleResponse(res, (res) => {
  //         setHistoryData(res.data);
  //       });
  //     })
  //     .catch((e) => console.log(e))
  //     .finally(() => {
  //       setHistoryLoading(false);
  //     });
  // };

  // 获取主机详情
  const fetchHostDetail = (id) => {
    setHistoryLoading(true);
    fetchGet(`${apiRequest.machineManagement.hostDetail}${id}`)
      .then((res) => {
        handleResponse(res, (res) => {
          const { deployment_information, history } = res.data;
          setHistoryData(history);
          setBaseEnvData(deployment_information);
          console.log(deployment_information);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setHistoryLoading(false);
      });
  };

  // 重启监控agent
  const fetchRestartMonitorAgent = () => {
    setLoading(true);
    fetchPost(apiRequest.machineManagement.restartMonitorAgent, {
      body: {
        host_ids: Object.keys(checkedList)
          .map((k) => checkedList[k])
          .flat(1)
          .map((item) => item.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success("重启监控Agent任务已下发");
          }
          if (res.code == 1) {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setRestartMonterAgentModal(false);
        setCheckedList({});
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 重启主机agent
  const fetchRestartHostAgent = () => {
    setLoading(true);
    fetchPost(apiRequest.machineManagement.restartHostAgent, {
      body: {
        host_ids: Object.keys(checkedList)
          .map((k) => checkedList[k])
          .flat(1)
          .map((item) => item.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success("重启主机Agent任务已下发");
          }
          if (res.code == 1) {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setRestartHostAgentModal(false);
        setCheckedList({});
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 主机进入｜退出维护模式
  const fetchMaintainChange = (e, checkedList) => {
    let host_arr = [];
    if (e) {
      host_arr = Object.keys(checkedList)
        .map((k) => checkedList[k])
        .flat(1)
        .filter((item) => {
          return !item.is_maintenance;
        });
    } else {
      host_arr = Object.keys(checkedList)
        .map((k) => checkedList[k])
        .flat(1)
        .filter((item) => {
          return item.is_maintenance;
        });
    }
    if (host_arr.length == 0) {
      setLoading(false);
      setOpenMaintainOneModal(false);
      setCloseMaintainOneModal(false);
      setOpenMaintainModal(false);
      setCloseMaintainModal(false);
      setCheckedList({});
      if (e) {
        message.success("主机开启维护模式成功");
      } else {
        message.success("主机关闭维护模式成功");
      }
      return;
    }
    setLoading(true);
    fetchPost(apiRequest.machineManagement.hostsMaintain, {
      body: {
        is_maintenance: e,
        host_ids: host_arr.map((item) => item.id),
      },
    })
      .then((res) => {
        if (res.data.code == 0) {
          if (e) {
            message.success("主机开启维护模式成功");
          } else {
            message.success("主机关闭维护模式成功");
          }
        }
        if (res.data.code == 1) {
          message.warning(res.data.message);
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setOpenMaintainOneModal(false);
        setCloseMaintainOneModal(false);
        setOpenMaintainModal(false);
        setCloseMaintainModal(false);
        setCheckedList({});
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  useEffect(() => {
    fetchData(
      { current: pagination.current, pageSize: pagination.pageSize },
      { ip: location.state?.ip }
    );
  }, []);

  return (
    <OmpContentWrapper>
      <div style={{ display: "flex" }}>
        <Button
          type="primary"
          onClick={() => {
            setAddMoadlVisible(true);
          }}
        >
          添加
        </Button>

        <Button
          type="primary"
          style={{ marginLeft: 10 }}
          onClick={() => {
            setBatchImport(true);
          }}
        >
          导入
        </Button>

        <Dropdown
          //placement="bottomLeft"
          overlay={
            <Menu>
              <Menu.Item
                key="openMaintain"
                style={{ textAlign: "center" }}
                onClick={() => setOpenMaintainModal(true)}
                disabled={
                  Object.keys(checkedList)
                    .map((k) => checkedList[k])
                    .flat(1)
                    .map((item) => item.id).length == 0
                }
              >
                开启维护模式
              </Menu.Item>
              <Menu.Item
                key="closeMaintain"
                style={{ textAlign: "center" }}
                disabled={
                  Object.keys(checkedList)
                    .map((k) => checkedList[k])
                    .flat(1)
                    .map((item) => item.id).length == 0
                }
                onClick={() => {
                  setCloseMaintainModal(true);
                }}
              >
                关闭维护模式
              </Menu.Item>
              <Menu.Item
                key="reStartHost"
                style={{ textAlign: "center" }}
                disabled={
                  Object.keys(checkedList)
                    .map((k) => checkedList[k])
                    .flat(1)
                    .map((item) => item.id).length == 0
                }
                onClick={() => {
                  setRestartHostAgentModal(true);
                }}
              >
                重启主机Agent
              </Menu.Item>
              <Menu.Item
                key="reStartMonitor"
                style={{ textAlign: "center" }}
                disabled={
                  Object.keys(checkedList)
                    .map((k) => checkedList[k])
                    .flat(1)
                    .map((item) => item.id).length == 0
                }
                onClick={() => {
                  setRestartMonterAgentModal(true);
                }}
              >
                重启监控Agent
              </Menu.Item>
            </Menu>
          }
          placement="bottomCenter"
        >
          <Button style={{ marginLeft: 10 }}>
            更多
            <DownOutlined />
          </Button>
        </Dropdown>

        <div style={{ display: "flex", marginLeft: "auto" }}>
          <span style={{ width: 60, display: "flex", alignItems: "center" }}>
            IP地址:
          </span>
          <OmpSelect
            searchLoading={searchLoading}
            selectValue={selectValue}
            listSource={ipListSource}
            setSelectValue={setSelectValue}
            // onFocus={()=>{
            //   location.state = {}
            // }}
            fetchData={(value) => {
              fetchData(
                { current: 1, pageSize: pagination.pageSize },
                { ip: value },
                pagination.ordering
              );
            }}
          />
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              //location.state = {}
              dispatch(refreshTime());
              setCheckedList({});
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
                { ip: selectValue },
                pagination.ordering
              );
            }}
          >
            刷新
          </Button>
        </div>
      </div>
      <div
        style={{
          border: "1px solid #ebeef2",
          backgroundColor: "white",
          marginTop: 10,
        }}
      >
        <OmpTable
          loading={loading}
          //scroll={{ x: 1900 }}
          onChange={(e, filters, sorter) => {
            let ordering = sorter.order
              ? `${sorter.order == "descend" ? "" : "-"}${sorter.columnKey}`
              : null;
            setTimeout(() => {
              fetchData(e, pagination.searchParams, ordering);
            }, 200);
          }}
          columns={getColumnsConfig(
            setIsShowDrawer,
            setRow,
            setUpdateMoadlVisible,
            fetchHostDetail,
            setCloseMaintainOneModal,
            setOpenMaintainOneModal,
            setShowIframe,
            history
          )}
          notSelectable={(record) => ({
            // 部署中的不能选中
            disabled: record?.host_agent == 3 || record?.monitor_agent == 3,
          })}
          dataSource={dataSource}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  justifyContent: "space-between",
                  lineHeight: 2.8,
                }}
              >
                <p>
                  已选中{" "}
                  {
                    Object.keys(checkedList)
                      .map((k) => checkedList[k])
                      .flat(1).length
                  }{" "}
                  条
                </p>
                <p style={{ color: "rgb(152, 157, 171)" }}>
                  共计{" "}
                  <span style={{ color: "rgb(63, 64, 70)" }}>
                    {pagination.total}
                  </span>{" "}
                  条
                </p>
              </div>
            ),
            ...pagination,
          }}
          rowKey={(record) => record.id}
          checkedState={[checkedList, setCheckedList]}
        />
      </div>
      {addModalVisible && (
        <AddMachineModal
          setLoading={setLoading}
          loading={loading}
          visibleHandle={[addModalVisible, setAddMoadlVisible]}
          createHost={createHost}
          msgInfo={{
            msgShow: msgShow,
            setMsgShow: setMsgShow,
            msg: msgRef.current,
          }}
        />
      )}
      {updateMoadlVisible && (
        <UpDateMachineModal
          loading={loading}
          setLoading={setLoading}
          visibleHandle={[updateMoadlVisible, setUpdateMoadlVisible]}
          createHost={upDateHost}
          row={row}
          msgInfo={{
            msgShow: msgShow,
            setMsgShow: setMsgShow,
            msg: msgRef.current,
          }}
        />
      )}
      <DetailHost
        isShowDrawer={isShowDrawer}
        setIsShowDrawer={setIsShowDrawer}
        loading={historyLoading}
        data={historyData}
        baseEnv={baseEnvData}
      />
      <OmpDrawer showIframe={showIframe} setShowIframe={setShowIframe} />

      <OmpMessageModal
        visibleHandle={[restartHostAgentModal, setRestartHostAgentModal]}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            提示
          </span>
        }
        loading={loading}
        onFinish={() => {
          fetchRestartHostAgent();
        }}
      >
        <div style={{ padding: "20px" }}>
          确定要重启{" "}
          <span style={{ fontWeight: 500 }}>
            {
              Object.keys(checkedList)
                .map((k) => checkedList[k])
                .flat(1).length
            }
            台
          </span>{" "}
          主机 <span style={{ fontWeight: 500 }}>主机Agent</span> ？
        </div>
      </OmpMessageModal>

      <OmpMessageModal
        visibleHandle={[restartMonterAgentModal, setRestartMonterAgentModal]}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            提示
          </span>
        }
        loading={loading}
        onFinish={() => {
          fetchRestartMonitorAgent();
        }}
      >
        <div style={{ padding: "20px" }}>
          确定要重启{" "}
          <span style={{ fontWeight: 500 }}>
            {
              Object.keys(checkedList)
                .map((k) => checkedList[k])
                .flat(1).length
            }
            台
          </span>{" "}
          主机 <span style={{ fontWeight: 500 }}>监控Agent</span> ？
        </div>
      </OmpMessageModal>

      <OmpMessageModal
        visibleHandle={[openMaintainModal, setOpenMaintainModal]}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            提示
          </span>
        }
        loading={loading}
        onFinish={() => {
          fetchMaintainChange(true, checkedList);
        }}
      >
        <div style={{ padding: "20px" }}>
          确定要对{" "}
          <span style={{ fontWeight: 500 }}>
            {
              Object.keys(checkedList)
                .map((k) => checkedList[k])
                .flat(1).length
            }
            台
          </span>{" "}
          主机下发 <span style={{ fontWeight: 500 }}>开启维护模式</span> 操作？
        </div>
      </OmpMessageModal>

      <OmpMessageModal
        visibleHandle={[closeMaintainModal, setCloseMaintainModal]}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            提示
          </span>
        }
        loading={loading}
        onFinish={() => {
          fetchMaintainChange(false, checkedList);
        }}
      >
        <div style={{ padding: "20px" }}>
          确定要对{" "}
          <span style={{ fontWeight: 500 }}>
            {
              Object.keys(checkedList)
                .map((k) => checkedList[k])
                .flat(1).length
            }
            台
          </span>{" "}
          主机下发 <span style={{ fontWeight: 500 }}>关闭维护模式</span> 操作？
        </div>
      </OmpMessageModal>

      <OmpMessageModal
        visibleHandle={[openMaintainOneModal, setOpenMaintainOneModal]}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            提示
          </span>
        }
        loading={loading}
        onFinish={() => {
          fetchMaintainChange(true, [row]);
        }}
      >
        <div style={{ padding: "20px" }}>
          确定要对 <span style={{ fontWeight: 500 }}>当前</span> 主机下发{" "}
          <span style={{ fontWeight: 500 }}>开启维护模式</span> 操作？
        </div>
      </OmpMessageModal>

      <OmpMessageModal
        visibleHandle={[closeMaintainOneModal, setCloseMaintainOneModal]}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            提示
          </span>
        }
        loading={loading}
        onFinish={() => {
          fetchMaintainChange(false, [row]);
        }}
      >
        <div style={{ padding: "20px" }}>
          确定要对 <span style={{ fontWeight: 500 }}>当前</span> 主机下发{" "}
          <span style={{ fontWeight: 500 }}>关闭维护模式</span> 操作？
        </div>
      </OmpMessageModal>
      <BatchImportMachineModal
        batchImport={batchImport}
        setBatchImport={setBatchImport}
        refreshData={() => {
          fetchData(
            { current: pagination.current, pageSize: pagination.pageSize },
            { ip: selectValue },
            pagination.ordering
          );
        }}
      ></BatchImportMachineModal>
    </OmpContentWrapper>
  );
};

export default MachineManagement;
