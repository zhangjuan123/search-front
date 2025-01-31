import React from 'react';
import { observable, computed, action } from 'mobx';
import { observer } from 'mobx-react';
import { Card, Row, Col, Select, Input, Button,Radio } from 'antd';
import Component from './Component';
import get from 'lodash/get';

@observer class SingleDataContent extends Component {
    // componentWillMount() {
    //     this.elastic.getSingleDataSource().then(result => {
    //         this.appStore.singleDatas = get(result, 'hits.hits', []).map(data => data._source);
    //     });

    // }
    render() {
        return (
                    <div className='contentManager'>
                    {this.props.sources.map((item, key) => {
                        return (<Row gutter={16} key={key}>
                            <Col span={1} className="gutter-row">
                             <Radio></Radio>
                            </Col>
                            <Col span={4} className="gutter-row">
                                <Input value={item.name} disabled />
                            </Col>
                            <Col span={3} className="gutter-row">
                                <Select value={item.index} style={{ width: '100%' }} disabled>
                                </Select>
                            </Col>
                            <Col span={9} className="gutter-row">
                                <Select
                                    mode="tags"
                                    placeholder="Please select"
                                    value={item.fields.slice()}
                                    style={{ width: '100%' }}
                                    disabled 
                                >   
                                </Select>
                            </Col>
                            
                        </Row>)
                    })}
                </div>
                
               
        )
    }
}

export default SingleDataContent;
