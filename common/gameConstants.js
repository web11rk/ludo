import * as dotenv from 'dotenv'
// import * as tf from '@tensorflow/tfjs';
dotenv.config()

export const LISTENS = {
    JOIN_GAME: 'joinGame',
    GIVE_CURRENT_GAME_STATE: 'giveCurrentGameState',
    LEAVE_GAME: 'leaveGame',
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    DISCONNECTING: 'disconnecting',
    ROLL_DICE: 'rollDice',
    AUTHENTICATE_PLAYER: 'authPlayer',
    CHAT: 'chat',
    MOVE_TOKEN:"moveToken",
    TOKEN_REACHED_END_POS : "tokenReachedEndPosition",
    PING : "ping",
    OPPONENT_DICE_VALUE :"opponetDiceValue",
    UNITY_LOGS:"unityLogs",
    UNITY_CATCH_ERROR:"unityCatchError",
    CHECK_FOR_TOURNAMENT_CANCEL : "checkForTournamentCancle"
    
};

export const EMITS = {
    START_GAME: 'startGame',
    CURRENT_GAME_STATE: 'currentGameState',
    ROOM_JOINED: 'roomJoined',
    CONNECTED_TO_SERVER: 'connectedToServer',
    PLAYERS_NOT_MATCHED: 'playersNotMatched',
    GAME_ALREADY_COMPLETED: 'gameAlreadyCompleted',
    GAME_ALREADY_STARTED: 'gameAlreadyStarted',
    RECONNECTION: 'reconnection',
    WAITING_TIME_RECONNECTION: "waitingReconnection",
    ROOM_JOINED: 'roomJoined',
    GAMEOVER: 'gameOver',
    MY_TURN_DATA: 'myTurnData',
    TURN: 'turn',
    AUTOPLAY_ENABLED: 'autoPlayEnabled',
    PLAYER_DROPPED: 'playerDropped',
    DICE_DATA: "diceData",
    AUTH_STATUS: 'authStatus',
    SEND_CHAT_DATA: "chatData",
    SEND_OPEN_TOKEN_DATA: "openTokenData",
    SEND_MOVE_TOKEN_DATA: "sendMoveTokenData",
    PLAYER_LEFT_THE_GAME: "playerLeftTheGame",
    KILLED_PLAYER_TOKEN_DATA: "killedPlayerTokenData",
    SEND_REMAINING_AUTOPLAY_CHANCES_DATA: "sendRemainingAutoplayChancesData",
    SEND_PLAYER_RANK_DATA:"sendPlayerRankData",
    ENABLE_TOKEN_CLICKING:"enableTokenClicking",
    PLAYER_CANNOT_JOIN: "playerCannotJoin",
    PLAYER_MOVABLE_TOKENS:"playerMovableTokens",
    SEND_AUTOPLAY_DICE_ROLL:"autoplayDiceRoll",
    SEND_PLAYER_SCORE : "sendPlayerScore",
    SEND_PLAYER_REMAINING_MOVES : "sendPlayerRemainingMoves",
    SEND_TIMER_MODE_REMAINING_TIME : "timerModeRemainingTime",
    PONG : "pong",
    SEND_MANUPULATED_DICE_VALUE : "manupulatedDiceValue",
    SEND_CONTEST_CANCELLED : "contestCancelled",
    SEND_EXTRA_MOVE : "extraMove",
    SEND_TOKEN_REACHED_HOME : "tokenReachedHome",
    SEND_TIMER_MODE_LAST_TURN_CALL : "timerModeLastTurnCall",
    SEND_ADDITION_SUBSTRACTION_SCORE : "additionSubstractionScore",
    SEND_AUTOPLAY_RUNNING_FLAG : "autoplayRunning",
    SEND_TOURNAMENT_PLAYER_NOT_MATCHED : "tounamentPlayerNotMatched",
    DATE_TIME_DATA :"serverDateTime",
    SEND_WAIT_FOR_GAMEOVER : "waitForGameOver",
    SEND_WAIT_FOR_NO_MATCH_FOUND : "waitForNoMatchFound",
    TOURNAMENT_NOT_CANCEL_STATUS : "tournamentNotCancelStatus",
    SOMETHING_WENT_WRONG : "someThingWentWrong",
    SEND_DICE_ROLL_DISABLE_DATA : "diceRollDisable"
};
export const GLOBALPARAMS = 
{
    isTimerRunning: false,
    turnMaxSixCount : 2,
    token_Open_Val :6,
    diceMinVal : 1,
    diceMaxVal : 6,
    consecutiveTripleSixMaxVal : 5,
    tokenStatus : {
        AT_BASE:'atBase',
        AT_RUNNING:'atRunning',
        AT_HOME:'atHome'
    },
    tokenPathLastIndex : 56,
    turnTimerDuration : 10,
    roomJoiningMinWaitingTimerLimit : 4,
    playerNameMaxCharLength : 10,
    tokenSingleEntityMoveTime : 150,
    tokenSingleEntityReturnTime :50,
    gameMode : {
        CLASSIC : "classic",
        QUICK : "quick",
        MOVES : "moves",
        TIMER : "timer"
    },
    autoPlayEnabled : false,
    croneJobs : {
        EVERY_FIVE_MINUTES : "*/5 * * * *",
        EVERY_DAY : "0 0 * * *",
        EVERY_SIX_HOUR : "0 */3 * * *",
        EVERY_MINUTE : "* * * * *"
    },
    maxChancesToHaveASix : 5,
    TtlTimeForSevenDays:604800,
    TtlTimeForOneDays:104800,
    isLogs:false,
    isProd:true,
    authEnabled:true,
    isDisposeObjects : false,
    dataValidationEnabled : true
}

export const TIMER_FUNCTIONS = 
{
    STOP_WAITING_TIMER: "StopWaitingTimer",
    STOP_TURN_TIMER: "StopTurnTimer",
    STOP_DICE_ROLLING: "StopDiceRolling",
    EMIT_BEFORE_TIMESTAMP: "emitBeforeTimestamp",
    STOP_TIMER_MODE_TIMER: "StopTimerModeTimer"
};
export const API_ERROR_CODES = 
{
    START_GAME_API_ERROR_CODE: "#SGAEC",
    END_GAME_API_ERROR_CODE: "#EGAEC",
    TOURNAMENT_CANCEL_API_ERROR_CODE: "#TCAEC",
    PLAYER_ASSOCIATED_WITH_GAME_API_ERROR_CODE: "#PAWGAEC"
};
export const AI_AGENTS_LEARNINIG_CONSTS = 
{
    learningRate : 0.1,
    discountFactor : 0.9,
    epsilon : 0.1,
    totalStates :3648,
    totalActions: 3,
    agentActions : {
        OPEN_TOKEN : "openToken",
        MOVE_TOKEN : "moveToken",
        KILL_TOKEN : "killToken",
        LEAVE_TURN : "leaveTurn"
    },
};

export const qTable = []//tf.variable(tf.randomNormal([AI_AGENTS_LEARNINIG_CONSTS.totalStates, AI_AGENTS_LEARNINIG_CONSTS.totalActions]));

export const LUDO_ROOM = "ludoRoom"+`${process.env.PORT}`

export const LUDO_ROOM_HGET = "LUDO_ROOM_HGET"+`${process.env.PORT}`

export const LUDO_ROOM_PLAYER_DATA =  LUDO_ROOM+"PlayerData"

export const  UNSAFE_TOKENS = new Map();

export const SAFE_ZONES = new Map();

export const TIMER_MODE_TIMER_COMPLTED = new Map();

export const JOINING_OBJECT_CLASSES = new Map();

export const KILL_RETURN_PATH = [0,4,5,10,12,17,18,23, 25, 30, 31, 36, 38, 43, 44, 49, 50];

export const CHECK_FOR_USER_ID_AUTH = 'user-auth-'

export const CHECK_FOR_USER_DETAILS = "user-detail-";

export const ONE_ROOM_KEY = "one_room:";

export const MOVE_PATH = [
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,
    36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57],
    
    [14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,
    46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,59,60,61,62,63,64],

    [27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,
    9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,65,66,67,68,69,70],

    [40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,
    23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,71,72,73,74,75,76]
];

export const PLAYER_TOKENS_ID = [
    't1', 't2', 't3', 't4','t5', 't6', 't7', 't8','t9', 't10', 't11', 
    't12','t13', 't14', 't15', 't16'
];

export const DEFAULT_RANKING = [
    
    {
        "rank": "RANK 1",
        "image": "",
        "price": 0
    },
    {
        "rank": "RANK 2",
        "image": "",
        "price": 0
    },
    {
        "rank": "RANK 3",
        "image": "",
        "price": 0
    },
    {
        "rank": "RANK 4",
        "image": "",
        "price": 0
    }
]
