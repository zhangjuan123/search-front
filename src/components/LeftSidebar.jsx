import React from 'react';
import { observable, computed, action } from 'mobx';
import { observer } from 'mobx-react';
import get from 'lodash/get';
import { Link } from 'react-router-dom'
import { Layout, Menu } from 'antd';
import Component from './Component';

const { Sider } = Layout;
const { SubMenu } = Menu;

@observer class LeftSidebar extends Component {

    componentWillMount() {
        this.elastic.getMultipleDataSource().then(result => {
            this.appStore.multipleDataNames = get(result, 'hits.hits', []).map(data => data._source.name);
        });

    }
    allTypes = ['手机', '网络', '支付', '前置', 'ESB']

    render() {
        return (
            <Sider style={{ overflow: 'auto', minHeight: '100vh' }}>
                <div className="logo">
                    <span>大数据智能运维平台</span>
                </div>
                <Menu mode="inline" theme="dark">
                    <SubMenu key="top" title="Analyze">
                        <p className="searchManage">查询</p>
                        <SubMenu key="sub1" title={<span>联合查询</span>}>
                            {this.appStore.multipleDataNames.map((item, key) => {
                                return (<Menu.Item key={key}><Link to="/core">{item}</Link></Menu.Item>)
                            })}
                            {/* <Menu.Item key="1"><Link to="/core">核心</Link></Menu.Item>
                            <Menu.Item key="2">手机</Menu.Item>
                            <Menu.Item key="3">网络</Menu.Item>
                            <Menu.Item key="4">支付</Menu.Item>
                            <Menu.Item key="5">前置</Menu.Item>
                            <Menu.Item key="6">ESB</Menu.Item> */}
                        </SubMenu>
                        <Menu.Item key="singledataSearch"><Link to="/singledataSearch">单数据源查询</Link></Menu.Item>
                        <Menu.Item key="historySearch"><Link to="/historySearch">历史查询记录</Link></Menu.Item>
                        <p className="searchManage">管理</p>
                        <Menu.Item key="singledata"><Link to="/singledata">单数据源配置</Link></Menu.Item>
                        <Menu.Item key="multipledata"><Link to="/multipledata">多数据源配置</Link></Menu.Item>
                    </SubMenu>
                </Menu>
            </Sider>
        );
    }
}

export default LeftSidebar;
