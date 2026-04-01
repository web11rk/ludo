import { AI_AGENTS_LEARNINIG_CONSTS, GLOBALPARAMS, qTable } from '../common/gameConstants.js';
import { GetOpponentsTokensPositions, GetPlayerInRoom, GetPlayerMovableTokens, GetPlayerTokenStatusArray, GetPlayerVariable, GetRoomVariable, GetTokenFromPlayer } from '../common/room.js';
//import * as tf from '@tensorflow/tfjs';
import { CanKillToken } from './killManager.js';
import { SendAutoPlayDiceRollData } from '../listenersAndEmitters/emitters.js';
import { DiceRollActions } from './DiceRollManager.js';
import { MoveToken, OpenToken } from './tokenManager.js';
import { GetAgentAction } from '../utils/mlMethods.js';


// #region Getter Methods
export async function GetGameState(roomID,playerID)
{
    let gameState = new Object();
    gameState.gameMode = await GetRoomVariable(roomID,"gameMode"),
    gameState.diceValue = await GetRoomVariable(roomID,"currentDiceNo"),
    gameState.myCurrentAutoPlayChances = await GetPlayerVariable(roomID,playerID,"currentAutoplayChances"),
    gameState.myMovableTokens = await GetPlayerMovableTokens(roomID,playerID,gameState.diceValue,true),
    gameState.myOpenableTokens = await GetPlayerTokenStatusArray(null,roomID,playerID,GLOBALPARAMS.tokenStatus.AT_BASE,true);
    gameState.opponentsTokens = await GetOpponentsTokensPositions(roomID,playerID);

    return gameState;    
}
export async function GetAvailableActions(roomID,playerID)
{
    let playerOpenableTokens = await GetPlayerTokenStatusArray(null,roomID,playerID,GLOBALPARAMS.tokenStatus.AT_BASE,false);
    let killableMovableTokens = await GetKillableMovableTokens(roomID,playerID);
    let playerMovableTokens =  killableMovableTokens.movableTokens;
    let playerKillableTokens = killableMovableTokens.killableTokens;
    let gameMode = await GetRoomVariable(roomID,"gameMode");

    let actionsArray = [];

    if(gameMode === GLOBALPARAMS.gameMode.CLASSIC)
    {
        if(playerOpenableTokens.length > 0)
        {
            for(let i=0;i<playerOpenableTokens.length;i++)
            {
                let actionObject = new Object();

                actionObject.action = AI_AGENTS_LEARNINIG_CONSTS.agentActions.OPEN_TOKEN,
                actionObject.tokenID = playerOpenableTokens[i].tokenID;
                actionsArray.push(actionObject);
            }

        }
    }
    if(playerMovableTokens.length > 0)
    {
        for(let i=0;i<playerMovableTokens.length;i++)
        {
            let actionObject = new Object();

            actionObject.action = AI_AGENTS_LEARNINIG_CONSTS.agentActions.MOVE_TOKEN,
            actionObject.tokenID = playerMovableTokens[i].tokenID;
            actionsArray.push(actionObject);
        }
    }
    if(playerKillableTokens.length > 0)
    {
        for(let i=0;i<playerKillableTokens.length;i++)
        {
            let actionObject = new Object();

            actionObject.action = AI_AGENTS_LEARNINIG_CONSTS.agentActions.KILL_TOKEN,
            actionObject.tokenID = playerKillableTokens[i].tokenID;
            actionsArray.push(actionObject);
        }
    }
    if(!GLOBALPARAMS.autoPlayEnabled)
    {
        let actionObject = new Object();

        actionObject.action = AI_AGENTS_LEARNINIG_CONSTS.agentActions.LEAVE_TURN;
        actionsArray.push(actionObject);
    }

    return actionsArray;
}
export async function GetKillableMovableTokens(roomID,playerID)
{
    let playerPath = await GetPlayerVariable(roomID,playerID,"myPath");
    let currentDiceValue = await GetRoomVariable(roomID,"currentDiceNo");
    let playerMovableTokens = await GetPlayerMovableTokens(roomID,playerID,currentDiceValue,false);
    let killableTokens = [];
    let movableTokens = [];

    for(let i=0;i<playerMovableTokens.length;i++)
    {
        let updatedPosition = playerPath[playerMovableTokens[i].currentIndex + currentDiceValue];
        let isTokenKillable = await CanKillToken(updatedPosition,playerMovableTokens[i],true);
        if(isTokenKillable)
        {
            killableTokens.push(playerMovableTokens[i]);
        }
        else
        {
            movableTokens.push(playerMovableTokens[i]);
        }
    }

    let killableMovableTokens = new Object();
    killableMovableTokens.killableTokens = killableTokens,
    killableMovableTokens.movableTokens = movableTokens;

    return killableMovableTokens;

}
export async function SetReward(state,action,nextState,actionObject)
{
    let rewardValue = 0;
    if(action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.LEAVE_TURN)
    {
        rewardValue = 1;
    }
    else if(action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.OPEN_TOKEN)
    {
        rewardValue = 2;
    }
    else if(action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.MOVE_TOKEN)
    {
        rewardValue = actionObject.moveTokenForwardValue;
        if(myOwnTokenCutValue != 0)
        {
            rewardValue = 0;
        }
    }
    else if(action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.KILL_TOKEN)
    {
        rewardValue = actionObject.moveTokenForwardValue;
        //if()
    }
}
//#endregion

// #region Bot Gameplay methods
export async function BotDiceRoll(roomID,playerID,diceValue)
{
    let botDiceRollObj = new Object();
    botDiceRollObj.playerID = playerID,
    botDiceRollObj.roomID = roomID,
    botDiceRollObj.diceValue = diceValue;

    let diceRollTime =  Math.floor(Math.random() * (5 - 2 + 1)) + 2;
    diceRollTime *= 1000;

    setTimeout(async()=>
    {
        await SendAutoPlayDiceRollData(roomID,JSON.stringify(botDiceRollObj));
        await BotAction(roomID,playerID);
    },diceRollTime)
}

export async function BotAction(roomID,playerID)
{
    let diceRollActionObj = new Object();
    diceRollActionObj.playerID = playerID,
    diceRollActionObj.roomID = roomID,
    diceRollActionObj.diceValue = await GetRoomVariable(roomID,"currentDiceNo");
    let canTakeAction = await DiceRollActions(null,diceRollActionObj);

    if(canTakeAction)
    {
        const gameState = await GetGameState(roomID,playerID);
        const actionsArray =  await GetAvailableActions(roomID,playerID);
        const choozenAction = await GetAgentAction(gameState,actionsArray);
        const botDetails = await GetPlayerInRoom(roomID,playerID);
        if(choozenAction)
        {
            let isActionCompleted = false;
            let actionObject = null;
            if(choozenAction.action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.LEAVE_TURN)
            {
                isActionCompleted = true;
                console.log("Bot is Leaving its turn");
            }
            else
            {
                const choozenToken = await GetTokenFromPlayer(roomID,playerID,choozenAction.tokenID);
                if(choozenAction.action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.OPEN_TOKEN)
                {
                    actionObject = await OpenToken(choozenToken,botDetails);
                    isActionCompleted = actionObject.takeAction;

                }
                else if(choozenAction.action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.MOVE_TOKEN)
                {
                    actionObject = await MoveToken(choozenToken,botDetails,true); 
                    isActionCompleted = actionObject.takeAction;
                }
                else if(choozenAction.action === AI_AGENTS_LEARNINIG_CONSTS.agentActions.KILL_TOKEN)
                {
                    actionObject =  await MoveToken(choozenToken,botDetails,true);
                    isActionCompleted = actionObject.takeAction; 
                }
                else
                {
                    console.log("action not defined "+choozenAction);
                }
            }

            if(isActionCompleted)
            {
                const nextGameState = await GetGameState(roomID,playerID);
                await SetReward(gameState,choozenAction.action,nextGameState,actionObject);
            }

        }
        else
        {
            console.log("Do not get choozen token");
        }
    }
    else
    {
        console.log("botCannotPlay");
    }

}
//#endregion

// Training loop
/*
for (let episode = 0; episode < numEpisodes; episode++) {
    let state = initialState;
    while (!isTerminal(state)) {
        const action = chooseAction(state);
        const nextState = transition(state, action);
        const reward = getReward(state, action, nextState);
        updateQValues(state, action, reward, nextState);
        state = nextState;
    }
}*/
