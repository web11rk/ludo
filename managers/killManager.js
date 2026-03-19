import { SendKilledTokenData } from "../listenersAndEmitters/emitters.js";
import { GLOBALPARAMS, KILL_RETURN_PATH, UNSAFE_TOKENS } from "../common/gameConstants.js";
import { GetPlayerVariable, GetRoomVariable, GetWaitingTimeForMovement, SetPlayerTokenObj, SetRoomVariable, UpdatePlayerScore } from "../common/room.js"
import _ from 'lodash'
import UtilityFunctions, { Delay } from "../utils/utilityFunctions.js";

export async function CanKillToken(myCurrentPath, token,doNotDeleteToken) {
    //console.log("UNSAFE_TOKENS>>>>>>>>>>>>",UNSAFE_TOKENS);
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    //console.log('>>>Can kill Token',token)
    const myPreviousDiceValue = await GetPlayerVariable(token.roomID, token.playerID, 'previousDiceVal')

    const myCurrentDice = await GetRoomVariable(token.roomID, 'currentDiceNo')
    //console.log(myCurrentDice,"?>>>>myCurrentDice")
    // const myPreviousDiceValue2 = await GetPlayerVariable(token.roomID,token.playerID,'myPreviousDiceValue2')

    const arrayOfUnsafeToken = Array.from(UNSAFE_TOKENS.entries()).map(([key, value]) => {
        return { key, ...value };
    });
    // console.log(">>>>>>>>>>arrayOfUnsafeToken",arrayOfUnsafeToken)
    const onlyMyRoomToken = arrayOfUnsafeToken.filter((x => x.roomID === token.roomID))

    const groupedData = _.groupBy(onlyMyRoomToken, 'tokenPosition')

    const perticularData = groupedData[myCurrentPath]

    const PreviousLocationPath = groupedData[+myCurrentPath - +myCurrentDice]
    
    //console.log('>>>Can kill PreviousLocationPath',PreviousLocationPath)
    
    //console.log('>>>Can kill perticularData',perticularData)

    const PreviousLocationPath3 = groupedData[+myCurrentPath - +myPreviousDiceValue]

    //console.log(">>>>>>>>",myCurrentPath,myCurrentDice)

    //console.log(">>>>>>>>",myCurrentPath,myPreviousDiceValue)

    //console.log(">>>>>>>PreviousLocationPath2",PreviousLocationPath3)
    
    //console.log(">>>>>>>PreviousLocationPath3",PreviousLocationPath)

    return CanKillLogic(perticularData, PreviousLocationPath, token, doNotDeleteToken)


    // console.log(PreviousLocationPath,"PreviousLocationPath====>>>>", +myCurrentPath - +myPreviousDiceValue)

    // if (!_.isEmpty(perticularData)) 
    // {
    //     console.log("TEST1")
    //     const goingToKillToken = perticularData?.filter((x) => x.playerID !== token.playerID)

    //     console.log(">>>>>>>>>>>>>>>Going To Kill",goingToKillToken)

    //     if (!_.isEmpty(goingToKillToken) && UtilityFunctions.checkOddEvenToken(goingToKillToken.length)) 
    //     {
    //         console.log("TEST2")
    //     } 
    //     else
    //     {
    //         if (!_.isEmpty(goingToKillToken))
    //         {
    //             console.log("TEST3")
    //             const goingToKillFirstToken = perticularData?.filter((x) => x.playerID !== token.playerID)[0]
    //             console.log(">>>>>>>>>>>>>goingToKillFirstToken",goingToKillFirstToken)
    //             /*const Lasttoken = */checkLastPositionKilledToken(token,PreviousLocationPath)
    //             // killedTokenArray.push(Lasttoken)
    //             const gameMode = await GetRoomVariable(token.roomID,'gameMode');
    //             let tokenPos = -1;
    //             if (gameMode === GLOBALPARAMS.gameMode.QUICK || gameMode === GLOBALPARAMS.gameMode.TIMER ||gameMode === GLOBALPARAMS.gameMode.MOVES) {
    //                 tokenPos = 0;
    //             }

    //             const objAdd = {
    //                 "tokenID": goingToKillFirstToken.tokenID,
    //                 "playerID": goingToKillFirstToken.playerID,
    //                 "roomID": goingToKillFirstToken.roomID,
    //                 "tokenStatus": GLOBALPARAMS.tokenStatus.AT_BASE,
    //                 "tokenPosition": tokenPos,
    //                 "isAtSafePosition": true,
    //                 "currentIndex": -1,
    //                 "tokenPreviosPosition" : goingToKillFirstToken.tokenPosition,
    //             }

    //             // killedTokenArray.push(objAdd)
    //             return {objAdd,checkDoubleToken:false}
    //         }else{
    //             console.log("TEST4")
    //             if(!_.isEmpty(PreviousLocationPath)){
    //                 console.log("TEST5")
    //                 console.log("II Am Previous Token Position")
    //                 const obj = checkLastPositionKilledToken(token,PreviousLocationPath)
    //                 UNSAFE_TOKENS.delete(obj.tokenPosition + obj.tokenID + obj.roomID);
    //                 return obj;
    //             }
    //         }
    //         console.log("TEST6")
    //         const obj = checkLastDoubleToken(groupedData,token)
    //         return obj;
    //     }
    // }
    // else
    // {
    //     const obj = checkLastDoubleToken(groupedData,token);
    //     console.log("TEST7")
    //     return obj
    // }
}

export async function checkLastPositionKilledToken(token, previousPath, doNotDeleteToken) {

    const gameMode = await GetRoomVariable(token.roomID, 'gameMode');
    let tokenPos = -1;
    if (gameMode === GLOBALPARAMS.gameMode.QUICK || gameMode === GLOBALPARAMS.gameMode.TIMER || gameMode === GLOBALPARAMS.gameMode.MOVES) {
        tokenPos = 0;
    }
    if (previousPath?.length > 1) {
        const PerticularTokenRunnerData = previousPath.filter(obj => obj.playerID === token.playerID);
        let checkAllTokenISMine = previousPath.every(x => x.playerID === token.playerID)
        let goingToKillFirstToken;
        if (!checkAllTokenISMine) {

            goingToKillFirstToken = (PerticularTokenRunnerData.length == 1 || PerticularTokenRunnerData.length == 3) && previousPath?.filter((x) => x.playerID !== token.playerID)[0]
            if (!goingToKillFirstToken) {
                if (previousPath.length > 0) {
                    //console.log(">>>>My TOken Running Test 5555")
                    goingToKillFirstToken = previousPath?.filter((x) => x.playerID === token.playerID)[0]
                }
            }
            //console.log(">>>>>>>>>>>>goingToKillFirstToken", goingToKillFirstToken)

            if (PerticularTokenRunnerData.length == 3) {
                //console.log("I AM CONTAINING THREE TOKEN")
                goingToKillFirstToken = previousPath?.filter((x) => x.playerID === token.playerID)[0]
                //console.log("I AM CONTAINING THREE TOKEN", goingToKillFirstToken)
            }

            GLOBALPARAMS.isLogs && console.log("Callling Last Token >>>>>>>>>>>>>>>>>>>>>>", goingToKillFirstToken);
            const objAdd = {
                "tokenID": goingToKillFirstToken.tokenID,
                "playerID": goingToKillFirstToken.playerID,
                "roomID": goingToKillFirstToken.roomID,
                "tokenStatus": GLOBALPARAMS.tokenStatus.AT_BASE,
                "tokenPosition": tokenPos,
                "isAtSafePosition": true,
                "currentIndex": -1,
                "tokenPreviosPosition": goingToKillFirstToken.tokenPosition,

            }
            GLOBALPARAMS.isLogs && console.log(objAdd, "---->>>>>>>>>>>objAdd");
            !doNotDeleteToken && UNSAFE_TOKENS.delete(objAdd.tokenPosition + objAdd.tokenID + objAdd.roomID);
            await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
            await SendKilledTokenData(objAdd.roomID, objAdd);
            return { objAdd, checkDoubleToken: false }
        }
        // const killedTokenPath = await GetPlayerVariable(KilledToken.roomID,KilledToken.playerID,"myPath");
        // return objAdd
    }
}

export async function checkLastDoubleToken(groupedData, token) {
    const gameMode = await GetRoomVariable(token.roomID, 'gameMode');
    let tokenPos = -1;
    if (gameMode === GLOBALPARAMS.gameMode.QUICK || gameMode === GLOBALPARAMS.gameMode.TIMER || gameMode === GLOBALPARAMS.gameMode.MOVES) {
        tokenPos = 0;
    }
    if (!_.isEmpty(groupedData)) {

        let doubleToken = groupedData[token.tokenPosition]

        if (!_.isEmpty(doubleToken) && (doubleToken.length === 2)) {

            let newArray = []
            newArray.push(...doubleToken)
            newArray.push(token)

            let checkAllTokenISMine = doubleToken.every(x => x.playerID === token.playerID)

            if (!checkAllTokenISMine) {
                GLOBALPARAMS.isLogs && console.log(doubleToken?.filter((x) => x.playerID === token.playerID), "------DobuleTokenFilter");
                const goingToKillToken = doubleToken?.filter((x) => x.playerID === token.playerID)[0]
                if (!_.isEmpty(goingToKillToken)) {

                    const objAdd = {
                        "tokenID": goingToKillToken.tokenID,
                        "playerID": goingToKillToken.playerID,
                        "roomID": goingToKillToken.roomID,
                        "tokenStatus": GLOBALPARAMS.tokenStatus.AT_BASE,
                        "tokenPosition": tokenPos,
                        "isAtSafePosition": true,
                        "currentIndex": -1,
                        "tokenPreviosPosition": goingToKillToken.tokenPosition,
                    }

                    !doNotDeleteToken && UNSAFE_TOKENS.delete(goingToKillToken.tokenPosition + goingToKillToken.tokenID + goingToKillToken.roomID);
                    let checkDoubleToken;
                    return { objAdd, checkDoubleToken: true }
                }
            }

        }
    }
}

export async function ReturnToBase(killedToken) {

    SetPlayerTokenObj(killedToken.roomID, killedToken.playerID, killedToken.tokenID, killedToken)
    setTimeout(async() => {

        await SendKilledTokenData(killedToken.roomID, killedToken);
    }, GetWaitingTimeForMovement(GLOBALPARAMS.tokenSingleEntityReturnTime, +killedToken.currentIndex))
}

export function GetkillTokenReturnTime(totalReturnMoves) {
    /*const val = killedTokenPlayerpath.indexOf(killedPos);
    const newArray = []
    for (var item of KILL_RETURN_PATH) 
    {
        if (item <= val) 
        {
            // GLOBALPARAMS.isLogs && console.log("Return Time B(a) "+item+ "Return Time B(a) "+val);
            newArray.push(item);
        }
        else
        {
            break;
        }
    }
    
    const returnTime = newArray.length * GLOBALPARAMS.tokenSingleEntityReturnTime;*/
    const returnTime = totalReturnMoves * GLOBALPARAMS.tokenSingleEntityReturnTime;

    return returnTime;
}

export async function CanKillLogic(MyForwardTokens, PreviousTokens, token ,doNotDeleteToken) {
    // console.log(">>>>>>>>>>>>>>>MyForwardTokens", MyForwardTokens)
    //console.log(">>>>>>>>>>>>>>>perticularData", PreviousTokens)
    const gameMode = await GetRoomVariable(token.roomID, 'gameMode');
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~CurrentToken", token)
    let tokenPos = -1;
    if (gameMode === GLOBALPARAMS.gameMode.QUICK || gameMode === GLOBALPARAMS.gameMode.TIMER || gameMode === GLOBALPARAMS.gameMode.MOVES) {
        tokenPos = 0;
    }

    if (!(MyForwardTokens === undefined)) {
        let checkAllTokenISMineInMyForward = MyForwardTokens?.every(x => x.playerID === token.playerID) ? true : false

        if (checkAllTokenISMineInMyForward) {

            //console.log(PreviousTokens, token, tokenPos)
            PreviousTokenCheckLogic(PreviousTokens, token, tokenPos,doNotDeleteToken)
            return { undefined, checkDoubleToken: false }
        } else {
            if (MyForwardTokens.length == 2) {
                PreviousTokenCheckLogic(PreviousTokens, token, tokenPos,doNotDeleteToken)
                return TWoTokenCheck(MyForwardTokens, token, tokenPos ,doNotDeleteToken)
            } else if (MyForwardTokens.length == 3) {
                PreviousTokenCheckLogic(PreviousTokens, token, tokenPos, doNotDeleteToken)
                return ThreeTokenCheck(MyForwardTokens, token, tokenPos ,doNotDeleteToken)
            } else if (MyForwardTokens.length == 4) {
                PreviousTokenCheckLogic(PreviousTokens, token, tokenPos ,doNotDeleteToken)
                return FourTokenCheck(MyForwardTokens, token, tokenPos, doNotDeleteToken)
            } else if (MyForwardTokens.length == 5) {
                PreviousTokenCheckLogic(PreviousTokens, token, tokenPos ,doNotDeleteToken)
                return FiveTokenCheck(MyForwardTokens, token, tokenPos, doNotDeleteToken)
            } else if (MyForwardTokens.length == 6) {
                PreviousTokenCheckLogic(PreviousTokens, token, tokenPos, doNotDeleteToken)
                return SixTokenCheck(MyForwardTokens, token, tokenPos, doNotDeleteToken)
            } else if (MyForwardTokens.length == 7) {
                PreviousTokenCheckLogic(PreviousTokens, token, tokenPos, doNotDeleteToken)
                return SevenTokenCheck(MyForwardTokens, token, tokenPos, doNotDeleteToken)
            }else if (MyForwardTokens.length == 8) {
                PreviousTokenCheckLogic(PreviousTokens, token, tokenPos, doNotDeleteToken)
                return EightTokenCheck(MyForwardTokens, token, tokenPos, doNotDeleteToken)
            }
        }
    }else{
        PreviousTokenCheckLogic(PreviousTokens, token, tokenPos, doNotDeleteToken)
    }
}

const PreviousTokenCheckLogic = (PreviousTokens, token, tokenPos ,doNotDeleteToken) => {
   //console.log(">>Previoous Token check Calling")
    let checkAllTokenISMineInMyPrevious = PreviousTokens?.every(x => x.playerID === token.playerID) ? true : false
    //console.log(">>checkAllTokenISMineInMyPrevious",checkAllTokenISMineInMyPrevious)
    //console.log(">>>PreviousTokens",PreviousTokens)
    if (!checkAllTokenISMineInMyPrevious) {
        if (!(PreviousTokens === undefined)) {
            //console.log(">>>>>>>PreviousTokens.length",PreviousTokens.length)
            switch (PreviousTokens.length) {
                case 2:
                    //console.log("I am case 2")
                    return TWoTokenCheckPrevious(PreviousTokens, token, tokenPos ,doNotDeleteToken)
                case 3:
                    return ThreeTokenCheckPrevious(PreviousTokens, token, tokenPos, doNotDeleteToken)
                case 4:
                    return FourTokenCheckPrevious(PreviousTokens, token, tokenPos, doNotDeleteToken)
                case 5:
                    return FiveTokenCheckPrevious(PreviousTokens, token, tokenPos, doNotDeleteToken)
                case 6:
                    return SixTokenCheckPrevious(PreviousTokens, token, tokenPos, doNotDeleteToken)
                case 6:
                    return SixTokenCheckPrevious(PreviousTokens, token, tokenPos, doNotDeleteToken)
                case 7:
                    return SevenTokenCheckPrevious(PreviousTokens, token, tokenPos, doNotDeleteToken)
                case 8:
                    return EightTokenCheck(PreviousTokens, token, tokenPos ,doNotDeleteToken)
                default:
                    return SevenTokenCheckPrevious(PreviousTokens, token, tokenPos, doNotDeleteToken)
            }
            // if (PreviousTokens.length == 2) {
            //     return TWoTokenCheckPrevious(PreviousTokens, token, tokenPos)
            // }
            // if (PreviousTokens.length == 3) {
            //     return ThreeTokenCheckPrevious(PreviousTokens, token, tokenPos)
            // }
            // if (PreviousTokens.length == 4) {
            //     return FourTokenCheckPrevious(PreviousTokens, token, tokenPos)
            // }
            // if (PreviousTokens.length == 5) {
            //     return FiveTokenCheckPrevious(PreviousTokens, token, tokenPos)
            // }
            // if (PreviousTokens.length == 6) {
            //     return SixTokenCheckPrevious(PreviousTokens, token, tokenPos)
            // }
            // if (PreviousTokens.length == 7) {
            //     return SevenTokenCheckPrevious(PreviousTokens, token, tokenPos)
            // }else{
            //     return SevenTokenCheckPrevious(PreviousTokens, token, tokenPos)
            // }
        }else{
            //console.log(">>>PreviousTokens is Undefined")
        }
    }
}

const TWoTokenCheck = async (data, token, tokenPos, doNotDeleteToken) => {
    const FirstTokenData = data?.filter((x) => x.playerID !== token.playerID)[0]
    const objAdd = KilledTokenSend(FirstTokenData,tokenPos)
    !doNotDeleteToken && UNSAFE_TOKENS.delete(FirstTokenData.tokenPosition + objAdd.tokenID + objAdd.roomID);
    return { objAdd, checkDoubleToken: false }
}

const ThreeTokenCheck = async (data, token, tokenPos) => {
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~SAFE Zone Due to Three token")
    return { undefined, checkDoubleToken: false }
}

const FourTokenCheck = async (data, token, tokenPos, doNotDeleteToken) => {
    const filteredData = data.filter((x) => x.playerID !== token.playerID)
    const checkOdd = UtilityFunctions.checkOddEvenToken(filteredData.length)
    const lastObject = filteredData[filteredData.length - 1];
    if (!_.isEmpty(lastObject) && !checkOdd) {
        const objAdd = KilledTokenSend(lastObject,tokenPos)
        !doNotDeleteToken &&  UNSAFE_TOKENS.delete(lastObject.tokenPosition + objAdd.tokenID + objAdd.roomID);
        return { objAdd, checkDoubleToken: false }
    }
}

const FiveTokenCheck = async (data, token, tokenPos) => {
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~SAFE Zone Due to Five token")
    return { undefined, checkDoubleToken: false }
}

const SixTokenCheck = async (data, token, tokenPos, doNotDeleteToken) => {
    const restToken = data.filter((x) => x.playerID !== token.playerID)
    const oddTokens = GetTokenWithPlayerIDCounts(restToken)
    const lastObject = oddTokens[oddTokens.length - 1];
    const objAdd = KilledTokenSend(lastObject,tokenPos)
    !doNotDeleteToken &&  UNSAFE_TOKENS.delete(lastObject.tokenPosition + objAdd.tokenID + objAdd.roomID);
    return { objAdd, checkDoubleToken: false }
}

const SevenTokenCheck = async (data,token,tokenPos) => {
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~SAFE Zone Due to Seven token")
    return { undefined, checkDoubleToken: false }
}

const EightTokenCheck = async (data,token,tokenPos, doNotDeleteToken) => {
    const restToken = data.filter((x) => x.playerID !== token.playerID)
    const oddTokens = GetTokenWithPlayerIDCounts(restToken)
    const lastObject = oddTokens[oddTokens.length - 1];
    const objAdd = KilledTokenSend(lastObject,tokenPos)
    !doNotDeleteToken &&  UNSAFE_TOKENS.delete(lastObject.tokenPosition + objAdd.tokenID + objAdd.roomID);
    return { objAdd, checkDoubleToken: false }
}


//PREVIOUS TOKEN CHECK


const TWoTokenCheckPrevious = async (data, token, tokenPos, doNotDeleteToken) => {
    //console.log(">>>Previous Tokens")
    const filteredData = data.filter(x => x.playerID == token.playerID)[0]
    const objAdd = KilledTokenSend(filteredData,tokenPos)
    await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
    await SendKilledTokenData(objAdd.roomID, objAdd);
    await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
    !doNotDeleteToken &&  UNSAFE_TOKENS.delete(filteredData.tokenPosition + objAdd.tokenID + objAdd.roomID);
    return { objAdd, checkDoubleToken: true }
}

const ThreeTokenCheckPrevious = async (data, token, tokenPos, doNotDeleteToken) => {
    // console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~SAFE Zone Due to Three token In Previous")
    let filteredData = data.filter((x) => x.playerID === token.playerID)[0]
    if(!_.isEmpty(filteredData)){
        const objAdd = KilledTokenSend(filteredData,tokenPos)
        !doNotDeleteToken && UNSAFE_TOKENS.delete(filteredData.tokenPosition + objAdd.tokenID + objAdd.roomID);
        SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
        await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
        await SendKilledTokenData(objAdd.roomID, objAdd);
        return { objAdd, checkDoubleToken: true }
    }
}


const FourTokenCheckPrevious = async (data, token, tokenPos, doNotDeleteToken) => {
    // console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~Four Token Check Previous")
    let filteredData = data.filter((x) => x.playerID !== token.playerID)

    if(!_.isEmpty(filteredData)){
        //Get Odd Player all data
        const all_tokens = GetTokenWithPlayerIDCounts(filteredData)
        if(!_.isEmpty(all_tokens) && all_tokens.length !== 1){
            const objAdd = KilledTokenSend(all_tokens[0],tokenPos)
            //console.log(">>>>>>>objAdd Other FourTokenCheckPrevious", objAdd)
            await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
            !doNotDeleteToken &&  UNSAFE_TOKENS.delete(all_tokens.tokenPosition + objAdd.tokenID + objAdd.roomID);
            await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
            await SendKilledTokenData(objAdd.roomID, objAdd);
            return { objAdd, checkDoubleToken: true }
        }
      
    }
    const filteredDataForSameToken = data.filter((x) => x.playerID === token.playerID)
    const TokensPlayerCounts = GetTokenWithPlayerIDCounts(filteredDataForSameToken)
    if(!_.isEmpty(TokensPlayerCounts) && (TokensPlayerCounts.length == 1 || TokensPlayerCounts.length == 3)){
        const objAdd = KilledTokenSend(TokensPlayerCounts[0],tokenPos)
        await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
        !doNotDeleteToken && UNSAFE_TOKENS.delete(TokensPlayerCounts[0].tokenPosition + objAdd.tokenID + objAdd.roomID);
        await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
        await SendKilledTokenData(objAdd.roomID, objAdd);
        return { objAdd, checkDoubleToken: true }
    }
}


const FiveTokenCheckPrevious = async (data, token, tokenPos) => {
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~Five Token Check Previous")
}

const SixTokenCheckPrevious = async (data, token, tokenPos , doNotDeleteToken) => {
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~Four Token Check Previous")
    let filteredData = data.filter((x) => x.playerID !== token.playerID)

    if(!_.isEmpty(filteredData)){
        //Get Odd Player all data
        const all_tokens = GetTokenWithPlayerIDCounts(filteredData)
        if(!_.isEmpty(all_tokens) && all_tokens.length !== 1){
            const objAdd = KilledTokenSend(all_tokens[0],tokenPos)
            //console.log(">>>>>>>objAdd Other Six Token When other Run", objAdd)
            await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
            !doNotDeleteToken && UNSAFE_TOKENS.delete(all_tokens[0].tokenPosition + objAdd.tokenID + objAdd.roomID);
            await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
            await SendKilledTokenData(objAdd.roomID, objAdd);
            return { objAdd, checkDoubleToken: true }
        }
      
    }
    const filteredDataForSameToken = data.filter((x) => x.playerID === token.playerID)
    const TokensPlayerCounts = GetTokenWithPlayerIDCounts(filteredDataForSameToken)
    if(!_.isEmpty(TokensPlayerCounts) && (TokensPlayerCounts.length == 1 || TokensPlayerCounts.length == 3)){
        //console.log(">>>>>>>objAdd Same Six Token when same kill", objAdd)
        const objAdd = KilledTokenSend(TokensPlayerCounts[0],tokenPos)
        !doNotDeleteToken && UNSAFE_TOKENS.delete(TokensPlayerCounts[0].tokenPosition + objAdd.tokenID + objAdd.roomID);
        await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
        await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
        await SendKilledTokenData(objAdd.roomID, objAdd);
        return { objAdd, checkDoubleToken: true }
    }
}

const SevenTokenCheckPrevious = async (data, token, tokenPos, doNotDeleteToken) => {
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~Seven Token Check Previous")
    let filteredData = data.filter((x) => x.playerID !== token.playerID)

    if(!_.isEmpty(filteredData)){
        //Get Odd Player all data
        const all_tokens = GetTokenWithPlayerIDCounts(filteredData)
        if(!_.isEmpty(all_tokens) && all_tokens.length !== 1){
            const objAdd = KilledTokenSend(all_tokens[0],tokenPos)
            await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
            !doNotDeleteToken && UNSAFE_TOKENS.delete(all_tokens[0].tokenPosition + objAdd.tokenID + objAdd.roomID);
            await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
            await SendKilledTokenData(objAdd.roomID, objAdd);
            return { objAdd, checkDoubleToken: true }
        }
      
    }
    const filteredDataForSameToken = data.filter((x) => x.playerID === token.playerID)
    const TokensPlayerCounts = GetTokenWithPlayerIDCounts(filteredDataForSameToken)
    if(!_.isEmpty(TokensPlayerCounts) && (TokensPlayerCounts.length == 1 || TokensPlayerCounts.length == 3)){
        const objAdd = KilledTokenSend(TokensPlayerCounts[0],tokenPos)
        await SetRoomVariable(objAdd.roomID,'oppositePlayerId',objAdd.playerID)
        !doNotDeleteToken && UNSAFE_TOKENS.delete(TokensPlayerCounts[0].tokenPosition + objAdd.tokenID + objAdd.roomID);
        await SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
        await SendKilledTokenData(objAdd.roomID, objAdd);
        return { objAdd, checkDoubleToken: true }
    }
}

// const EightTokenCheckPrevious = async (data, token, tokenPos) => {
//     console.log(">>>>>>>>>>>>>>>>>>>>>>>~~~~~~~~~~~~~~~~~~~~~~Seven Token Check Previous")
//     let filteredData = data.filter((x) => x.playerID !== token.playerID)

//     if(!_.isEmpty(filteredData)){
//         //Get Odd Player all data
//         const all_tokens = GetTokenWithPlayerIDCounts(filteredData)
//         if(!_.isEmpty(all_tokens) && all_tokens.length !== 1){
//             const objAdd = {
//                 "tokenID": all_tokens[0].tokenID,
//                 "playerID": all_tokens[0].playerID,
//                 "roomID": all_tokens[0].roomID,
//                 "tokenStatus": GLOBALPARAMS.tokenStatus.AT_BASE,
//                 "tokenPosition": tokenPos,
//                 "isAtSafePosition": true,
//                 "currentIndex": -1,
//                 "tokenPreviosPosition": all_tokens[0].tokenPosition,
//             }
//             console.log(">>>>>>>objAdd Other Six Token When other Run", objAdd)
//             UNSAFE_TOKENS.delete(all_tokens.tokenPosition + objAdd.tokenID + objAdd.roomID);
//             SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
//             SendKilledTokenData(objAdd.roomID, JSON.stringify(objAdd));
//         }
      
//     }
//     const filteredDataForSameToken = data.filter((x) => x.playerID === token.playerID)
//     const TokensPlayerCounts = GetTokenWithPlayerIDCounts(filteredDataForSameToken)
//     if(!_.isEmpty(TokensPlayerCounts) && (TokensPlayerCounts.length == 1 || TokensPlayerCounts.length == 3)){
//         const objAdd = {
//             "tokenID": TokensPlayerCounts[0].tokenID,
//             "playerID": TokensPlayerCounts[0].playerID,
//             "roomID": TokensPlayerCounts[0].roomID,
//             "tokenStatus": GLOBALPARAMS.tokenStatus.AT_BASE,
//             "tokenPosition": tokenPos,
//             "isAtSafePosition": true,
//             "currentIndex": -1,
//             "tokenPreviosPosition": TokensPlayerCounts[0].tokenPosition,
//         }
//         console.log(">>>>>>>objAdd Same Seven Token when same kill", objAdd)
//         UNSAFE_TOKENS.delete(TokensPlayerCounts[0].tokenPosition + objAdd.tokenID + objAdd.roomID);
//         SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
//         SendKilledTokenData(objAdd.roomID, JSON.stringify(objAdd));
//     }
// }


const GetTokenWithPlayerIDCounts = (tokens) => {

    const playerIDCounts = tokens.reduce((acc, token) => {
        acc[token.playerID] = (acc[token.playerID] || 0) + 1;
        return acc;
    }, {});

    // Add the count as a new key to each object
    const tokensWithPlayerIDCounts = tokens.map(token => ({
        ...token,
        playerIDCount: playerIDCounts[token.playerID]
    }));
    //those token who have odd value
    const oddPlayerIDCounts = tokensWithPlayerIDCounts.filter(token => token.playerIDCount % 2 !== 0);
    
    return oddPlayerIDCounts
}

export const KilledTokenSend = (data,tokenPos) => {
    const objAdd = {
        "tokenID": data.tokenID,
        "playerID": data.playerID,
        "roomID": data.roomID,
        "tokenStatus": GLOBALPARAMS.tokenStatus.AT_BASE,
        "tokenPosition": tokenPos,
        "isAtSafePosition": true,
        "currentIndex": -1,
        "tokenPreviosPosition": data.tokenPosition,
    }
    return objAdd
}





const GetUniqPlayerDataFromArray = (oddPlayerIDCounts) => {
    const uniquePlayerIDs = new Set(oddPlayerIDCounts.map(token => token.playerID));

    // Create an array of unique objects using the unique playerIDs
    const uniqueObjects = [...uniquePlayerIDs].map(playerID => {
        return oddPlayerIDCounts.find(token => token.playerID === playerID);
    });
    return uniqueObjects
}
//Check First Token is Mine and First Token is other at new Path
//Check Two Token both same token and other new token at same path
//Check Three Token at same path and Fourth Token is other token