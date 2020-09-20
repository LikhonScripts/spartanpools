import React, { useEffect, useState, useContext } from 'react'
import { Context } from '../../context'
import { Tabs, Row, Col, message } from 'antd';
import { LoadingOutlined, LeftOutlined, UnlockOutlined, PlusOutlined } from '@ant-design/icons';

import { withRouter } from 'react-router-dom';
import queryString from 'query-string';

import { BreadcrumbCombo, InputPane, PoolPaneSide, OutputPane } from '../components/common'
import '../../App.css';
import { HR, LabelGroup, Center } from '../components/elements';
import { Button } from '../components/elements';
import { paneStyles, colStyles, rowStyles } from '../components/styles'
import { bn, formatBN, convertFromWei, convertToWei } from '../../utils'
import { getLiquidityUnits } from '../../math'

import {
    BNB_ADDR, SPARTA_ADDR, ROUTER_ADDR, getRouterContract, getTokenContract, getListedTokens,
    getPoolData, getTokenData, getTokenDetails,
    getListedPools, getPoolsData, getPool
} from '../../client/web3'

const { TabPane } = Tabs;

const NewStake = (props) => {

    const context = useContext(Context)
    const [pool, setPool] = useState({
        'symbol': 'XXX',
        'name': 'XXX',
        'address': BNB_ADDR,
        'price': 0,
        'volume': 0,
        'baseAmount': 0,
        'tokenAmount': 0,
        'depth': 0,
        'txCount': 0,
        'apy': 0,
        'units': 0,
        'fees': 0
    })

    const [userData, setUserData] = useState({
        'baseBalance': 0,
        'tokenBalance': 0,
        'address': SPARTA_ADDR,
        'symbol': 'XXX',
        'balance': 0,
        'input': 0,
    })

    // const [stake1Data, setStake1Data] = useState({
    //     address: SPARTA_ADDR,
    //     symbol: 'XXX',
    //     balance: 0,
    //     input: 0,
    // })
    // const [stake2Data, setStake2Data] = useState({
    //     address: BNB_ADDR,
    //     symbol: 'XXX',
    //     balance: 0,
    //     input: 0,
    // })

    const [liquidityData, setStakeData] = useState({
        baseAmount: '',
        tokenAmount: '',
    })

    const [estLiquidityUnits, setLiquidityUnits] = useState(0)
    const [approvalToken, setApprovalToken] = useState(false)
    const [approvalBase, setApprovalBase] = useState(false)
    const [startTx, setStartTx] = useState(false);
    const [endTx, setEndTx] = useState(false);

    const [unstakeAmount, setUnstakeAmount] = useState(0)

    useEffect(() => {
        if (context.connected) {
            getPools()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context.connected])

    const getPools = async () => {
        let tokenArray = await getListedTokens()
        context.setContext({ 'tokenArray': tokenArray })
        let poolArray = await getListedPools()
        context.setContext({ 'poolArray': poolArray })
        context.setContext({ 'poolsData': await getPoolsData(tokenArray) })
    }

    useEffect(() => {
        if (context.poolsData) {
            getData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context.connected, context.poolsData])

    const getData = async () => {
        let params = queryString.parse(props.location.search)
        const pool = await getPoolData(params.pool, context.poolsData)
        setPool(pool)

        const baseData = await getTokenData(SPARTA_ADDR, context.walletData)
        const tokenData = await getTokenData(pool.address, context.walletData)

        let _userData = {
            'baseBalance': baseData?.balance,
            'tokenBalance': tokenData?.balance,
            'address': tokenData?.address,
            'symbol': tokenData?.symbol,
            'balance': tokenData?.balance,
            'input': 0,
        }

        setUserData(_userData)

        // setStake1Data(await getStakeInputData(baseData.balance, baseData))
        // setStake2Data(await getStakeInputData(tokenData.balance, tokenData))

        console.log(baseData?.balance, tokenData?.balance)

        let liquidityData = getPairedAmount(baseData?.balance, tokenData?.balance, pool)
        setStakeData(liquidityData)
        const estLiquidityUnits = getLiquidityUnits(liquidityData, pool)
        setLiquidityUnits(estLiquidityUnits)
        checkApproval(SPARTA_ADDR) ? setApprovalBase(true) : setApprovalBase(false)
        checkApproval(pool.address) ? setApprovalToken(true) : setApprovalToken(false)

    }

    // const getStakeInputData = async (input, baseData) => {
    //     const liquidityData = {
    //         address: baseData.address,
    //         symbol: baseData.symbol,
    //         balance: baseData.balance,
    //         input: formatBN(bn(input), 0),
    //     }
    //     return liquidityData
    // }

    const checkApproval = async (address) => {
        if (address === BNB_ADDR) {
            return true
        } else {
            const contract = getTokenContract(address)
            const approvalToken = await contract.methods.allowance(context.walletData.address, ROUTER_ADDR).call()
            if (+approvalToken > 0) {
                return true
            } else {
                return false
            }
        }
    }

    const onAddTokenChange = async (e) => {
        const input = e.target.value
        let liquidityData = {
            baseAmount: "0",
            tokenAmount: formatBN(convertToWei(input), 0),
        }
        setStakeData(liquidityData)
        setLiquidityUnits(getLiquidityUnits(liquidityData, pool))
        let _userData = {
            'baseBalance': userData.baseBalance,
            'tokenBalance': userData.tokenBalance,
            'address': userData.address,
            'symbol': userData.symbol,
            'balance': userData.balance,
            'input': formatBN(bn(input), 0),
        }
        setUserData(_userData)
    }

    const changeTokenAmount = async (amount) => {
        const finalAmt = (bn(userData?.baseBalance)).times(amount).div(100)
        console.log(finalAmt, formatBN(finalAmt, 0))
        let liquidityData = {
            baseAmount: "0",
            tokenAmount: formatBN(finalAmt, 0),
        }
        setStakeData(liquidityData)
        setLiquidityUnits(getLiquidityUnits(liquidityData, pool))
        let _userData = {
            'baseBalance': userData.baseBalance,
            'tokenBalance': userData.tokenBalance,
            'address': userData.address,
            'symbol': userData.symbol,
            'balance': userData.balance,
            'input': formatBN(bn(finalAmt), 0),
        }
        setUserData(_userData)
    }

    const onAddSymmChange = async (e) => {
        const input = e.target.value
        let liquidityData = getPairedAmount(userData.baseBalance, formatBN(convertToWei(input), 0), pool)
        setStakeData(liquidityData)
        setLiquidityUnits(getLiquidityUnits(liquidityData, pool))
        let _userData = {
            'baseBalance': userData.baseBalance,
            'tokenBalance': userData.tokenBalance,
            'address': userData.address,
            'symbol': userData.symbol,
            'balance': userData.balance,
            'input': formatBN(bn(input), 0),
        }
        setUserData(_userData)
    }

    const changeSymmAmount = async (amount) => {
        const finalAmt = (bn(userData?.baseBalance)).times(amount).div(100)
        console.log(finalAmt, formatBN(finalAmt, 0))
        let liquidityData = getPairedAmount(formatBN(finalAmt, 0), userData.tokenBalance, pool)
        setStakeData(liquidityData)
        setLiquidityUnits(getLiquidityUnits(liquidityData, pool))
        let _userData = {
            'baseBalance': userData.baseBalance,
            'tokenBalance': userData.tokenBalance,
            'address': userData.address,
            'symbol': userData.symbol,
            'balance': userData.balance,
            'input': formatBN(bn(finalAmt), 0),
        }
        setUserData(_userData)
    }

    // const onStake2Change = async (e) => {
    //     const input = e.target.value
    //     setStake2Data(await getStakeInputData(convertToWei(input), stake2Data))
    //     const liquidityData = {
    //         baseAmount: stake1Data.input,
    //         tokenAmount: convertToWei(input)
    //     }
    //     setLiquidityUnits(getLiquidityUnits(liquidityData, pool))
    // }

    const getPairedAmount = (baseBalance, tokenAmount, pool) => {

        let price = pool.baseAmount / pool.tokenAmount  // 10:100 100/10 = 10
        let baseAmount = price * +tokenAmount  // 10 * 1 = 10

        let liquidityData = {
            baseAmount: "",
            tokenAmount: "",
        }

        if (baseAmount > baseBalance) {
            console.log({ baseBalance })
            liquidityData.tokenAmount = (baseBalance / price)  // 5 / 10 -> 0.5
            liquidityData.baseAmount = formatBN(bn(baseBalance), 0) // 5
        } else {
            liquidityData.tokenAmount = formatBN(bn(tokenAmount), 0) // 1
            liquidityData.baseAmount = formatBN(bn(baseAmount), 0) // 10
        }

        console.log(baseBalance, tokenAmount)
        console.log(price, tokenAmount, liquidityData)

        return liquidityData
    }

    // const changeStake2Amount = async (amount) => {
    //     const finalAmt = (amount * stake2Data?.balance) / 100
    //     setStake2Data(await getStakeInputData(finalAmt, stake2Data))
    //     const liquidityData = {
    //         baseAmount: stake1Data.input,
    //         tokenAmount: finalAmt
    //     }
    //     setLiquidityUnits(getLiquidityUnits(liquidityData, pool))
    // }

    const changeUnstakeAmount = async (amount) => {
        setUnstakeAmount(amount)
    }

    const getEstShare = () => {
        const newUnits = (bn(estLiquidityUnits)).plus(bn(pool.units))
        const share = ((bn(estLiquidityUnits)).div(newUnits)).toFixed(2)
        return (share * 100).toFixed(2)
    }

    const unlockSparta = async () => {
        unlock(SPARTA_ADDR)
    }

    const unlockToken = async () => {
        unlock(pool.address)
    }

    const unlock = async (address) => {
        const contract = getTokenContract(address)
        const supply = await contract.methods.totalSupply().call()
        await contract.methods.approve(ROUTER_ADDR, supply).send({
            from: context.walletData.address,
            gasPrice: '',
            gas: ''
        })
        message.success(`Approved!`, 2);
    }

    const addLiquidity = async () => {
        setStartTx(true)
        let contract = getRouterContract()
        console.log(liquidityData.baseAmount, liquidityData.tokenAmount, pool.address)
        await contract.methods.addLiquidity(liquidityData.baseAmount, liquidityData.tokenAmount, pool.address).send({
            from: context.walletData.address,
            gasPrice: '',
            gas: '',
            value: pool.address === BNB_ADDR ? liquidityData.tokenAmount : 0
        })
        message.success(`Transaction Sent!`, 2);
        setStartTx(false)
        setEndTx(true)
        updatePool()
        context.setContext({ 'tokenDetailsArray': await getTokenDetails(context.walletData.address, context.tokenArray) })
    }

    const unstake = async () => {
        let contract = getRouterContract()
        const tx = await contract.methods.removeLiquidity(unstakeAmount * 100, pool.address).send({
            from: context.walletData.address,
            gasPrice: '',
            gas: ''
        })
        console.log(tx.transactionHash)
        message.success(`Transaction Sent!`, 2);
        setStartTx(false)
        setEndTx(true)
        updatePool()
        context.setContext({ 'tokenDetailsArray': await getTokenDetails(context.walletData.address, context.tokenArray) })

    }

    const updatePool = async () => {
        setPool(await getPool(pool.address))
    }

    const back = () => {
        props.history.push('/pools')
    }

    const changeTabs = () => {
        setStartTx(false)
        setEndTx(false)
    }



    return (
        <>
            <BreadcrumbCombo title={'ADD LIQUIDITY'} parent={'POOLS'} link={'/pools'} child={'ADD LIQUIDITY'}></BreadcrumbCombo>
            <HR></HR>
            <br />
            <Row>
                <Col xs={8}>
                    <Button onClick={back} icon={<LeftOutlined />} type={'text'} size={'large'} >BACK</Button>

                </Col>
                <Col xs={16} style={{ textAlign: 'right' }}>
                    <Button type="secondary" >REMOVE LIQUIDITY</Button>
                </Col>
            </Row>

            <Row>
                <Col xs={8}>

                    <PoolPaneSide pool={pool} price={context.spartanPrice} />

                </Col>
                <Col xs={16}>
                    <Row style={{ marginLeft: 20, marginRight: 20 }}>
                        <Col xs={24} >
                            <Tabs defaultActiveKey="1" onChange={changeTabs}>
                                <TabPane tab={`ADD ${pool.symbol}`} key="1">
                                    <AddAsymmPane
                                        pool={pool}
                                        userData={userData}
                                        liquidityData={liquidityData}
                                        onAddChange={onAddTokenChange}
                                        changeAmount={changeTokenAmount}
                                        // stake2Data={stake2Data}
                                        // onStake2Change={onStake2Change}
                                        // changeStake2Amount={changeStake2Amount}
                                        estLiquidityUnits={estLiquidityUnits}
                                        getEstShare={getEstShare}
                                        approvalBase={approvalBase}
                                        approvalToken={approvalToken}
                                        unlockSparta={unlockSparta}
                                        unlockToken={unlockToken}
                                        addLiquidity={addLiquidity}
                                        startTx={startTx}
                                        endTx={endTx}
                                    />
                                </TabPane>
                                <TabPane tab={`ADD ${pool.symbol} + SPARTA`} key="2">

                                    <AddSymmPane
                                        pool={pool}
                                        userData={userData}
                                        liquidityData={liquidityData}
                                        onAddChange={onAddSymmChange}
                                        changeAmount={changeSymmAmount}
                                        // stake2Data={stake2Data}
                                        // onStake2Change={onStake2Change}
                                        // changeStake2Amount={changeStake2Amount}
                                        estLiquidityUnits={estLiquidityUnits}
                                        getEstShare={getEstShare}
                                        approvalBase={approvalBase}
                                        approvalToken={approvalToken}
                                        unlockSparta={unlockSparta}
                                        unlockToken={unlockToken}
                                        addLiquidity={addLiquidity}
                                        startTx={startTx}
                                        endTx={endTx}
                                    />
                                </TabPane>
                                <TabPane tab={`REMOVE ${pool.symbol} + SPARTA`} key="3">
                                    <UnstakePane
                                        pool={pool}
                                        changeUnstakeAmount={changeUnstakeAmount}
                                        approvalToken={approvalToken}
                                        unlock={unlockToken}
                                        unstake={unstake}
                                        startTx={startTx}
                                        endTx={endTx}
                                    />
                                </TabPane>
                            </Tabs>
                        </Col>
                    </Row>
                </Col>
            </Row>

        </>
    )
}

export default withRouter(NewStake)

const AddSymmPane = (props) => {

    return (
        <>
            <Row style={paneStyles}>
                <Col xs={24} style={colStyles}>
                    <Row >
                        <Col xs={1}>
                        </Col>
                        <Col xs={9} style={{ marginRight: 30 }}>
                            <InputPane
                                paneData={props.userData}
                                onInputChange={props.onAddChange}
                                changeAmount={props.changeAmount}
                            />

                        </Col>
                        <Col xs={1} style={{ display: 'flex', alignItems: 'center', justifyContent: "center" }}>
                            <PlusOutlined style={{ fontSize: 24 }} />
                        </Col>
                        <Col xs={9} style={{ marginLeft: 30 }}>

                            <LabelGroup size={30}
                                element={`${convertFromWei(props.liquidityData.baseAmount)}`}
                                label={`PAIRED AMOUNT (SPARTA)`} />

                            {/* <InputPane
                                paneData={props.stake2Data}
                                onInputChange={props.onStake2Change}
                                changeAmount={props.changeStake2Amount} /> */}

                            <br />
                        </Col>

                        <Col xs={1}>
                        </Col>
                    </Row>
                    <Row style={rowStyles}>
                        <Col xs={12}>
                            <Center><LabelGroup size={18} element={`${convertFromWei(props.estLiquidityUnits.toFixed(0))}`} label={'ESTIMATED UNITS'} /></Center>
                        </Col>
                        <Col xs={12}>
                            <Center><LabelGroup size={18} element={`${props.getEstShare()}%`} label={'ESTIMATED SHARE'} /></Center>
                        </Col>

                    </Row>
                    <Row>
                        <Col xs={8}>
                            {!props.approvalBase &&
                                <Center><Button type={'secondary'} onClick={props.unlockSparta} icon={<UnlockOutlined />}>UNLOCK {props.userData.symbol}</Button></Center>
                            }
                        </Col>
                        <Col xs={8}>
                            {props.approvalBase && props.approvalToken && props.startTx && !props.endTx &&
                                <Center><Button type={'primary'} onClick={props.addLiquidity} icon={<LoadingOutlined />} >ADD TO POOL</Button></Center>
                            }
                            {props.approvalBase && props.approvalToken && !props.startTx &&
                                <Center><Button type={'primary'} onClick={props.addLiquidity}>ADD TO POOL</Button></Center>
                            }
                        </Col>
                        <Col xs={8}>
                            {!props.approvalToken &&
                                <Center><Button type={'secondary'} onClick={props.unlockToken} icon={<UnlockOutlined />}>UNLOCK {props.pool.symbol}</Button></Center>
                            }
                        </Col>
                    </Row>
                </Col>
            </Row>
        </>
    )
}

const AddAsymmPane = (props) => {

    return (
        <>
            <Row style={paneStyles}>
                <Col xs={24} style={colStyles}>
                    <Row >
                        <Col xs={1}>
                        </Col>
                        <Col xs={22} style={{ marginRight: 30 }}>
                            <InputPane
                                paneData={props.userData}
                                onInputChange={props.onAddChange}
                                changeAmount={props.changeAmount}
                            />

                        </Col>

                        <Col xs={1}>
                        </Col>
                    </Row>
                    <Row style={rowStyles}>
                        <Col xs={12}>
                            <Center><LabelGroup size={18} element={`${convertFromWei(props.estLiquidityUnits.toFixed(0))}`} label={'ESTIMATED UNITS'} /></Center>
                        </Col>
                        <Col xs={12}>
                            <Center><LabelGroup size={18} element={`${props.getEstShare()}%`} label={'ESTIMATED SHARE'} /></Center>
                        </Col>

                    </Row>
                    <Row>
                        <Col xs={8}>
                            {!props.approvalToken &&
                                <Center><Button type={'secondary'} onClick={props.unlockToken} icon={<UnlockOutlined />}>UNLOCK {props.pool.symbol}</Button></Center>
                            }
                        </Col>
                        <Col xs={8}>
                            {props.approvalBase && props.approvalToken && props.startTx && !props.endTx &&
                                <Center><Button type={'primary'} onClick={props.addLiquidity} icon={<LoadingOutlined />} >ADD TO POOL</Button></Center>
                            }
                            {props.approvalBase && props.approvalToken && !props.startTx &&
                                <Center><Button type={'primary'} onClick={props.addLiquidity}>ADD TO POOL</Button></Center>
                            }
                        </Col>

                    </Row>
                </Col>
            </Row>
        </>
    )
}

const UnstakePane = (props) => {


    return (
        <>
            <Row style={paneStyles}>
                <Col xs={24} style={colStyles}>
                    <Row>
                        <Col xs={6}>
                        </Col>
                        <Col xs={12}>
                            <OutputPane
                                changeAmount={props.changeUnstakeAmount} />
                        </Col>
                        <Col xs={6}>
                        </Col>
                    </Row>
                    <Row style={rowStyles}>
                    </Row>
                    <br></br>
                    <Center><Button type={'primary'} onClick={props.unstake}>WITHDRAW FROM POOL</Button></Center>
                </Col>
            </Row>
        </>
    )
}