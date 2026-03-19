import axios from "axios";
import {
  GetAllPlayersInRoom,
  GetRoomVariable,
  SetRoomVariable,
  hasSameScore,
} from "../common/room.js";
import { DeleteRoom } from "./roomsManager.js";
import LudoAllData from "../mongoModels/logsModel.js";
import _ from "lodash";
import { API_ERROR_CODES, GLOBALPARAMS, ONE_ROOM_KEY } from "../common/gameConstants.js";
import { EncryptData } from "../utils/encrypter.js";
import { deleteSingleLogFile, writeToLog } from "../logs/loggerManager.js";
import { SendContestCancelled, SendSomenthingWentWrongStatus, SendTournamentNotCancelStatus } from "../listenersAndEmitters/emitters.js";
import TournamentCancelledModel from "../mongoModels/tournamentCancelledModel.js";
import PlayerNotAssociatedWithRoomModel from "../mongoModels/playerNotAssociatedWithRoom.js";
import redisClientWeb11 from "../config/redisClientForWeb11.js";

class ApiManager {
  /**
   * The `startGameApiCall` function makes an API call to start a game, passing the necessary data such
   * as player information, contest ID, and room ID.
   * @param room - The `room` parameter is an object that represents a game room. It contains
   * information about the players in the room, such as their IDs and game contest ID.
   * @param [matchNotFound=false] - The `matchNotFound` parameter is a boolean flag that indicates
   * whether a match was not found for the players in the room. If `matchNotFound` is `true`, it means
   * that no match was found, and if it is `false`, it means that a match was found.
   */
  static async startGameApiCall(roomID, matchNotFound = false) {
    // const { playersInRoom } = room;
    let group_type = await GetRoomVariable(roomID, "isGroupContest");
    let match_id = await GetRoomVariable(roomID, "match_id");
    let contestId = await GetRoomVariable(roomID, "contestId");
    let contest_id = await GetRoomVariable(roomID, "contest_id");
    if (matchNotFound) {
      GLOBALPARAMS.isLogs && console.log("callling NO_MATCH_FOUND function(");
      deleteSingleLogFile(roomID);
    }
    //  GLOBALPARAMS.isLogs && console.log(group_type && matchNotFound,"group_type && matchNotFound",group_type,matchNotFound)
    if (group_type && matchNotFound) {
      const players = await GetAllPlayersInRoom(roomID);
      const arrayOfPlayer = [];
      for (var player of players) {
        arrayOfPlayer.push(player.playerID);
      }
      //  GLOBALPARAMS.isLogs && console.log(process.env.GROUP_BACKEND_URL_UMATCH_END,"Api process.env.GROUP_BACKEND_URL_UMATCH_END");
      try {
        const response = await axios.post(
          process.env.GROUP_BACKEND_URL_UMATCH_END,
          {
            data: await EncryptData(
              JSON.stringify({
                status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
                players: arrayOfPlayer,
                contestId: contestId,
                contest_id: contest_id,
                roomId: roomID,
                match_id: match_id,
                unity_room_id: generateUnityRoomId(),
              })
            ),
          },
          {
            headers: {
              "api-key": process.env.BACKEND_TOKEN,
            },
          }
        );

        if (!matchNotFound) {
          writeToLog(
            "Startgame data" +
              JSON.stringify({
                status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
                players: arrayOfPlayer,
                contestId: contestId,
                contest_id: contest_id,
                roomId: roomID,
                match_id: match_id,
                unity_room_id: generateUnityRoomId(),
              }),
            roomID
          );
          writeToLog(
            "Response From Server Side" + JSON.stringify(response.data),
            roomID
          );
        }
        GLOBALPARAMS.isLogs &&
          console.log("startgame data", {
            status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
            players: arrayOfPlayer,
            contestId: contestId,
            contest_id: contest_id,
            roomId: roomID,
            match_id: match_id,
            unity_room_id: generateUnityRoomId(),
          });
        GLOBALPARAMS.isLogs &&
          console.log("In startgame encypted", {
            data: await EncryptData(
              JSON.stringify({
                status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
                players: arrayOfPlayer,
                contestId: contestId,
                contest_id: contest_id,
                roomId: roomID,
                match_id: match_id,
                unity_room_id: generateUnityRoomId(),
              })
            ),
          });
        if (response.data.success) {
          await SetRoomVariable(roomID, "match_id", response.data.matchId);
          await LudoAllData.updateField(
            roomID,
            "match_id",
            response.data.matchId
          );
        }
        if (matchNotFound) {
          await DeleteRoom(roomID);
        }
        await LudoAllData.updateField(
          roomID,
          "StartApiCallData",
          JSON.stringify(response.data)
        );
      } catch (error) {
        writeToLog(
          `${process.env.GROUP_BACKEND_URL_UMATCH_END} -- Api Failed`,
          roomID
        );
        await LudoAllData.updateField(
          roomID,
          "apiNotWorking",
          `Api Not Working From Winning Group Side ${process.env.GROUP_BACKEND_URL_UMATCH_END}`
        );
      }
    } else if (!group_type) {
      GLOBALPARAMS.isLogs &&
        console.log(
          process.env.BACKEND_URL_MATCH_START,
          "BACKEND_URL_MATCH_START"
        );
      const players = await GetAllPlayersInRoom(roomID);
      const arrayOfPlayer = [];
      for (var player of players) {
        arrayOfPlayer.push(player.playerID);
      }
      try {
        const response = await axios.post(
          process.env.BACKEND_URL_MATCH_START,
          {
            data: await EncryptData(
              JSON.stringify({
                status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
                players: arrayOfPlayer,
                contestId: roomID,
                roomId: roomID,
                unity_room_id: generateUnityRoomId(),
              })
            ),
          },
          {
            headers: {
              "api-key": process.env.BACKEND_TOKEN,
            },
          }
        );

        if (!matchNotFound) {
          writeToLog(
            "Startgame data" +
              JSON.stringify({
                status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
                players: arrayOfPlayer,
                contestId: roomID,
                roomId: roomID,
                unity_room_id: generateUnityRoomId(),
              }),
            roomID
          );
          writeToLog(
            "Response From Server Side" + JSON.stringify(response.data),
            roomID
          );
        }
        GLOBALPARAMS.isLogs &&
          console.log("startgame data", {
            status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
            players: arrayOfPlayer,
            contestId: roomID,
            roomId: roomID,
            unity_room_id: generateUnityRoomId(),
          });
        GLOBALPARAMS.isLogs &&
          console.log("In startgame encypted", {
            data: await EncryptData(
              JSON.stringify({
                status: matchNotFound ? "NO_MATCH_FOUND" : "MATCH_FOUND",
                players: arrayOfPlayer,
                contestId: roomID,
                roomId: roomID,
                unity_room_id: generateUnityRoomId(),
              })
            ),
          });
        if (response.data.success) {
          await SetRoomVariable(roomID, "match_id", response.data.matchId);
          await LudoAllData.updateField(
            roomID,
            "match_id",
            response.data.matchId
          );
        }
        if (matchNotFound) {
          await DeleteRoom(roomID);
        }
        await LudoAllData.updateField(
          roomID,
          "StartApiCallData",
          JSON.stringify(response.data)
        );
      } catch (error) {
        writeToLog(
          `${process.env.BACKEND_URL_MATCH_START} -- Api Failed`,
          roomID
        );
        await LudoAllData.updateField(
          roomID,
          "apiNotWorking",
          `Api Not Working From Winning Side ${process.env.BACKEND_URL_MATCH_START} `
        );
      }
    } else {
      GLOBALPARAMS.isLogs && console.log("No Start Api Calll");
    }
  }
  /**
   * The function `endGameApiCall` makes an API call to submit the endgame data including scores, contest
   * ID, and match ID.
   * @param room - The `room` parameter is an object that represents a game room. It likely contains
   * information about the players, their scores, and other relevant data.
   */

  // rank: 1, user_id: 12345678, score: 1
  // scores: [{rank: 1, user_id: 12345678, score: 1}]

  static async endGameApiCall(roomID, players) 
  {
    //console.log("END Game>>>>>>>>>>>>>>>>>>>>>>>>");
    let match_id = await GetRoomVariable(roomID, "match_id");
    let contestId = await GetRoomVariable(roomID, "contestId");
    let contest_id = await GetRoomVariable(roomID, "contest_id");
    let group_type = await GetRoomVariable(roomID, "isGroupContest");
    let isTournament = await GetRoomVariable(roomID, "isTournament");
    // console.log('>>>>>>isTournament',isTournament)
    let playerData = [];
    let playerAssociated = false
    for (var item of players) {
      let data = {
        sub: item.playerID,
        rank: parseInt(item.rank),
        score: item.score,
      };
      playerData.push(data);
    }
    // const sameScore = hasSameScore(playerData)
    const data = players.find((x) => x.isGameTied);
    //this dataSendToServer for Backend Single Contest
    const dataSendToServer = !_.isEmpty(data) ? [] : playerData;
    if (!_.isEmpty(players)) {
      for (var item of players) {
        let apiSendObj = new Object();
        apiSendObj.room_id = roomID;
        apiSendObj.user_id = item.playerID;
        playerAssociated = await this.CheckIfPlayerAssociatedWithRoom(apiSendObj);
      }
    }
    if (playerAssociated.authenticated === true) {
      if (group_type) {
        try {
          const response = await axios.post(
            process.env.GROUP_BACKEND_URL_MATCH_RESULTS,
            {
              data: await EncryptData(
                JSON.stringify({
                  contestId: contestId,
                  contest_id: contest_id,
                  roomId: roomID,
                  matchId: +match_id,
                  scores: playerData,
                })
              ),
            },
            {
              headers: {
                "api-key": process.env.BACKEND_TOKEN,
              },
            }
          );
          //  GLOBALPARAMS.isLogs && console.log(response,"response===>>>>response")
          await LudoAllData.updateField(
            roomID,
            "EndApiCallData",
            JSON.stringify(response.data)
          );
          writeToLog(
            "EndGameApiCall Data" +
              JSON.stringify({
                contestId: contestId,
                contest_id: contest_id,
                roomId: roomID,
                matchId: +match_id,
                scores: playerData,
              }),
            roomID
          );
        } catch (error) {
          writeToLog(
            `${process.env.GROUP_BACKEND_URL_MATCH_RESULTS} -- Api Failed`,
            roomID
          );
          await LudoAllData.updateField(
            roomID,
            "apiNotWorking",
            `Api Not Working From Winning Side Match Result Group  ${roomID}`
          );
        }
      } else if (isTournament) {
        try {
          //console.log(">>> I am From Tounament")
          //console.log(process.env.GROUP_BACKEND_URL_TOURNAMENT_MATCH_RESULTS,">>> I am From Tounament")
          let tournament = {};
          (tournament.isTournament = isTournament),
            (tournament.tournament_id = await GetRoomVariable(
              roomID,
              "tournament_id"
            ));
          tournament.round_count = await GetRoomVariable(roomID, "round_count");
          GLOBALPARAMS.isLogs &&
            console.log(">>>>End Game Api Called playerData", playerData);
          const response = await axios.post(
            process.env.GROUP_BACKEND_URL_TOURNAMENT_MATCH_RESULTS,
            {
              data: await EncryptData(
                JSON.stringify({
                  contestId: contestId,
                  contest_id: contest_id,
                  roomId: roomID,
                  matchId: +match_id,
                  scores: playerData,
                  ...tournament,
                })
              ),
            },
            {
              headers: {
                "api-key": process.env.BACKEND_TOKEN,
              },
            }
          );
          //console.log(response.data,"response===>>>>response")
          // console.log(
          //   "Data ---api sending from our side", JSON.stringify(
          //     {
          //         contestId: contestId,
          //         contest_id: contest_id,
          //         roomId: roomID,
          //         matchId: +match_id,
          //         scores: playerData,
          //         ...tournament
          //     }
          //   ),
          // )
          await LudoAllData.updateField(
            roomID,
            "EndApiCallData",
            JSON.stringify(response.data)
          );
          writeToLog(
            "EndGameApiCall Data" +
              JSON.stringify({
                contestId: contestId,
                contest_id: contest_id,
                roomId: roomID,
                matchId: +match_id,
                scores: playerData,
                ...tournament,
              }),
            roomID
          );

          if (response.data?.success === true) {
            if (response.data?.is_final === true) {
              //console.log("END GAME API TOURNAMENT OVER");
              await SetRoomVariable(roomID, "isTournamentOver", true);
              await SetRoomVariable(roomID, "tournamentNextRoundName", "Final");
              const dummyObj = {
                GameOver: true,
                IsFinal: true,
              };
              await SetRoomVariable(
                roomID,
                "responseFromTournamentApi",
                JSON.stringify(dummyObj)
              );
            } else {
              //console.log("END GAME API TOURNAMENT NOT OVER");
              await SetRoomVariable(
                roomID,
                "tournamentNextRoundName",
                response?.data?.data?.round_name
              );
              await SetRoomVariable(
                roomID,
                "responseFromTournamentApi",
                JSON.stringify(response.data.data)
              );
            }
          } else {
            //console.log("I am Not Working")
            await SetRoomVariable(roomID, "apiNotWorking", true);
            writeToLog(
              `${process.env.GROUP_BACKEND_URL_TOURNAMENT_MATCH_RESULTS} api success not true`,
              roomID
            );
          }
          //console.log("I am Last called")
        } catch (error) {
          // console.log("Error In EndGame Api", error);
          await SetRoomVariable(roomID, "apiNotWorking", true);
          writeToLog(
            `${process.env.GROUP_BACKEND_URL_TOURNAMENT_MATCH_RESULTS} -- Api Failed`,
            roomID
          );
          await LudoAllData.updateField(
            roomID,
            "apiNotWorking",
            `Api Not Working From Winning Side Match Result Group  ${roomID}`
          );
        }
      } else {
        try {
          const response = await axios.post(
            process.env.BACKEND_URL_MATCH_END,
            {
              data: await EncryptData(
                JSON.stringify({
                  contestId: roomID,
                  roomId: roomID,
                  matchId: +match_id,
                  scores: dataSendToServer,
                })
              ),
            },
            {
              headers: {
                "api-key": process.env.BACKEND_TOKEN,
              },
            }
          );
          //  GLOBALPARAMS.isLogs && console.log(response,"============>>>>>>>>>response");
          writeToLog(
            "EndGameApiCall Data" +
              JSON.stringify({
                contestId: roomID,
                roomId: roomID,
                matchId: +match_id,
                scores: dataSendToServer,
              }),
            roomID
          );
          GLOBALPARAMS.isLogs &&
            console.log("endgame data", {
              contestId: roomID,
              roomId: roomID,
              matchId: +match_id,
              scores: dataSendToServer,
            });
          GLOBALPARAMS.isLogs &&
            console.log({
              data: await EncryptData(
                JSON.stringify({
                  contestId: roomID,
                  roomId: roomID,
                  matchId: +match_id,
                  scores: dataSendToServer,
                })
              ),
            });
          //  GLOBALPARAMS.isLogs && console.log(response.data);
          await LudoAllData.updateField(
            roomID,
            "EndApiCallData",
            JSON.stringify(response.data)
          );
          writeToLog(
            "EndGameApiCall Response From Server Side" +
              JSON.stringify(response.data),
            roomID
          );
        } catch (error) {
          writeToLog(
            `${process.env.BACKEND_URL_MATCH_END} -- Api Failed`,
            roomID
          );
          await LudoAllData.updateField(
            roomID,
            "apiNotWorking",
            `Api Not Working From Winning Side Match End -Single Api- ${roomID}`
          );
        }
      }
    } else {
      // console.log("Calling from Else I am called for player associated");
    }
  }

  static async checkGameCancelledApi(data,socket)
  {

    let isTournamentCancel = false;
    GLOBALPARAMS.isLogs && console.log('checkGameCancelledApi Called',data);
    if(data.isTournament == true)
    {
      if(data.round_count == 1)
      {
        try 
        {
          const response = await axios.post(
            process.env.GROUP_BACKEND_CHECK_CANCEL_STATUS,
            {
              data: await EncryptData(
                JSON.stringify({
                  tournament_id: data.tournament_id,
                  round_count: data.round_count,
                  user_id: data.user_id,
                })
              ),
            },
            {
              headers: {
                "api-key": process.env.BACKEND_TOKEN,
              },
            }
          );
          // console.log('response >>>checkGameCancelledApi',response)
          if(response.data.success == true)
          {
            data.requestApi = JSON.stringify({
              tournament_id: data.tournament_id,
              round_count: data.round_count,
              user_id: data.user_id,
            })
            data.responseApi = JSON.stringify(response.data)
            data.status = true;
            await TournamentCancelledModel.add(data)
            if(response.data.is_cancel)
            {
              await SendContestCancelled(data.roomID,socket,"contestCancelled",false)
              isTournamentCancel = true;
              await DeleteRoom(data.roomID)
            }
            else
            {
              await SendTournamentNotCancelStatus(socket,"tournamentNotCancelled");
              isTournamentCancel = false;
            }
          }
          else
          {
            data.requestApi = JSON.stringify({
              tournament_id: data.tournament_id,
              round_count: data.round_count,
              user_id: data.user_id,
            })
            data.responseApi = JSON.stringify(response.data)
            data.status = false
            await TournamentCancelledModel.add(data);
            await SendSomenthingWentWrongStatus(socket,API_ERROR_CODES.TOURNAMENT_CANCEL_API_ERROR_CODE);
            isTournamentCancel = true;
            await DeleteRoom(data.roomID);
          }
        } 
        catch (error) 
        {
          await SendSomenthingWentWrongStatus(socket,API_ERROR_CODES.TOURNAMENT_CANCEL_API_ERROR_CODE);
          console.log('>>>Error in checkGamecancelled api',error)
          data.responseApi = 'Its Catch Block Call'
          data.status = false
          await TournamentCancelledModel.add(data);
          isTournamentCancel = true;
          await DeleteRoom(data.roomID)
        }

        return  isTournamentCancel;
      }
    }
    else
    {
      console.log("isTournament is not true in cacle api");
      return  isTournamentCancel;
     
    }
  }
  
  static async CheckIfPlayerAssociatedWithRoom(dataToSend)
  {
    GLOBALPARAMS.isLogs && console.log("Enter inside CheckIfPlayerAssociatedWithRoom 0");
    let playerAssociatedWithRoomObj = new Object();
    playerAssociatedWithRoomObj.authenticated = false,
    playerAssociatedWithRoomObj.apiWorking = true;

    try 
    {
      GLOBALPARAMS.isLogs &&
        console.log(
          "Enter inside CheckIfPlayerAssociatedWithRoom 1",
          dataToSend
        );
      // const response = await axios.post(
      //   process.env.CHECK_PLAYER_ASSOCIATED_WITH_ROOM_STATUS,
      //   dataToSend,
      //   {
      //     headers: 
      //     {
      //       "api-key": process.env.BACKEND_TOKEN,
      //     },
      //   }
      // );
      let oneRoomKey = ONE_ROOM_KEY + dataToSend.room_id;
      const response = await redisClientWeb11.hExists(
        oneRoomKey,
        dataToSend.user_id
      );

      GLOBALPARAMS.isLogs && console.log("Enter inside CheckIfPlayerAssociatedWithRoom 2@ request "+JSON.stringify(dataToSend));
      // console.log('response >>>checkGameCancelledApi',response)
      if(response === true)
      {
        GLOBALPARAMS.isLogs && console.log("Enter inside CheckIfPlayerAssociatedWithRoom 3");

       /* let data  = new Object();
        data.roomID = dataToSend.room_id,
        data.user_id = dataToSend.user_id,
        data.requestApi = JSON.stringify(dataToSend),
        data.responseApi = JSON.stringify(response.data),
        data.status = true;

        await PlayerNotAssociatedWithRoomModel.CheckAndAdd(dataToSend.room_id, dataToSend.user_id,data);*/
  
        // if(response.data.is_exist == true)
        // {
        //   GLOBALPARAMS.isLogs && console.log("Enter inside CheckIfPlayerAssociatedWithRoom 4");
        // }
        playerAssociatedWithRoomObj.authenticated = true;
      }
      else
      {
        GLOBALPARAMS.isLogs && console.log("Enter inside CheckIfPlayerAssociatedWithRoom 5"); //
        let data  = new Object();
        data.roomID = dataToSend.room_id,
        data.user_id = dataToSend.user_id,
        data.requestApi = JSON.stringify(dataToSend),
        data.responseApi = JSON.stringify(response.data),
        data.status = false;
        data.redisKeyMissMatch = "Redis Key Miss Match PlayerAssociatedWithRoom ";
        await PlayerNotAssociatedWithRoomModel.CheckAndAdd(dataToSend.room_id, dataToSend.user_id,data);

        playerAssociatedWithRoomObj.apiWorking = false;
        
      }
      return playerAssociatedWithRoomObj;
    } 
    catch (error) 
    {
      console.log("Enter inside CheckIfPlayerAssociatedWithRoom 6 error "+error);
      let data  = new Object();
        data.roomID = dataToSend.room_id,
        data.user_id = dataToSend.user_id,
        data.requestApi = JSON.stringify(dataToSend),
        data.responseApi = "its a catchBlock "+error,
        data.status = false;
        data.redisKeyMissMatch = "Redis Key Miss Match PlayerAssociatedWithRoom";
      await PlayerNotAssociatedWithRoomModel.CheckAndAdd(dataToSend.room_id, dataToSend.user_id,data);
      playerAssociatedWithRoomObj.apiWorking = false;
      return playerAssociatedWithRoomObj;
    }
    
  }
}
const generateUnityRoomId = () => Math.floor(100000 + Math.random() * 999999);

export default ApiManager;
