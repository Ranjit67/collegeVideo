const express = require("express");
const socket = require("socket.io");

const app = express();
const http = require("http");
const server = http.createServer(app);
const io = socket(server, {
  cors: {
    origin: "*",
  },
});
const room = {};
const idToRoom = {};
const roomToId = {};
const roomToName = {};
const mentorStart = {};
const studentIdToUuid = {};
const UuidToStudentId = {};
const mentorStaticId = {};
const mutedMentor = {};
const videoMute = {};
const screenShare = {};
// //const roomTohost = {}; //temp use in mentor start class

// const studentToMentor = {}; //student when send connection to mentor then only comes data.
// const mentorId = {};

io.on("connection", (socket) => {
  //screen share phase
  socket.on("screen share start", (payload) => {
    const { mentorUuid } = payload;
    if (screenShare[mentorUuid]) {
      delete screenShare[mentorUuid];
      screenShare[mentorUuid] = socket.id;
      screenShare[mentorUuid];
      room[mentorUuid].forEach((studentUuid) => {
        socket.emit("mentor share screen", {
          studentId: UuidToStudentId[studentUuid],
        });
      });
    } else {
      screenShare[mentorUuid] = socket.id;
      room[mentorUuid].forEach((studentUuid) => {
        socket.emit("mentor share screen", {
          studentId: UuidToStudentId[studentUuid],
        });
      });
    }
  });
  // screenShare side
  socket.on("sending screen signal", (payload) => {
    const { userToSignal, callerID, signal, mentorUuid } = payload;
    io.to(userToSignal).emit("mentor send to student", {
      mentorFrontId: callerID,
      mentorSignal: signal,
      subjectName: roomToName[idToRoom[roomToId[mentorUuid]]],
      timeStamp: mentorStart[idToRoom[roomToId[mentorUuid]]],
      muteStatus: mutedMentor[idToRoom[roomToId[mentorUuid]]],
      videoStatus: videoMute[idToRoom[roomToId[mentorUuid]]],
      data: "share",
    });
  });
  //
  socket.on("mentor start class", (payload) => {
    const { subjectName, mentorId, dat } = payload;
    room[mentorId] = [];
    idToRoom[socket.id] = mentorId;
    roomToId[mentorId] = socket.id;
    roomToName[mentorId] = subjectName;
    mentorStart[mentorId] = dat;
    mutedMentor[mentorId] = true;
    videoMute[mentorId] = true;
    screenShare[mentorId] = false;
    socket.broadcast.emit("new mentor comme", {
      mentorUuid: idToRoom[socket.id],
      subjectName: roomToName[mentorId],
      timeStamp: mentorStart[mentorId],
      id: socket.id,
    });
  });
  socket.on("mentor refresh try", (payload) => {
    const { mentorUui } = payload;
    if (roomToName[mentorUui] && mentorStart[mentorUui]) {
      delete idToRoom[roomToId[mentorUui]];
      idToRoom[socket.id] = mentorUui;
      if (mentorStaticId[roomToId[mentorUui]]) {
        delete mentorStaticId[roomToId[mentorUui]];
        mentorStaticId[socket.id] = mentorUui;
      }
      socket.broadcast.emit("send class already exit", {
        roomToName,
        roomToId,
        mentorStart,
      });
      socket.emit("already have", {
        subjectName: roomToName[mentorUui],
        startClass: mentorStart[mentorUui],
      });
    }
  });

  socket.on("after refresh", (payload) => {
    const { roomRef } = payload;
    if (room[roomRef]) {
      room[roomRef].forEach((key) => {
        socket.emit("student want to connect", {
          studentId: UuidToStudentId[key],
        });
      });
    }
  });
  socket.on("First browse this page", (data) => {
    socket.emit("send class already exit", {
      roomToName,
      roomToId,
      mentorStart,
    });
  });
  socket.on("student want to connect", (payload) => {
    const { mentorUuid, studentUuid, staticId } = payload;

    if (UuidToStudentId[studentUuid]) {
      delete studentIdToUuid[UuidToStudentId[studentUuid]];
      studentIdToUuid[socket.id] = studentUuid;
      delete UuidToStudentId[studentUuid];
      UuidToStudentId[studentUuid] = socket.id;
      if (mentorStaticId[roomToId[mentorUuid]] === mentorUuid) {
        io.to(roomToId[mentorUuid]).emit("student want to connect", {
          studentId: socket.id,
        });
      }
    } else {
      if (room[mentorUuid]) {
        UuidToStudentId[studentUuid] = socket.id;
        studentIdToUuid[socket.id] = studentUuid;
        mentorStaticId[staticId] = mentorUuid;

        room[mentorUuid].push(studentUuid);
        io.to(roomToId[mentorUuid]).emit("student want to connect", {
          studentId: socket.id,
          studentUuid,
        });
      }
    }
  });
  socket.on("sending signal", (payload) => {
    const { userToSignal, callerID, signal, data } = payload;

    io.to(userToSignal).emit("mentor send to student", {
      mentorFrontId: callerID,
      mentorSignal: signal,
      subjectName: roomToName[idToRoom[socket.id]],
      timeStamp: mentorStart[idToRoom[socket.id]],
      muteStatus: mutedMentor[idToRoom[socket.id]],
      videoStatus: videoMute[idToRoom[socket.id]],

      data,
    });
  });
  socket.on("returning signal", (payload) => {
    const { signal, mentorFrontId, data } = payload;

    io.to(mentorFrontId).emit("student signal to mentor", {
      studentSignal: signal,
      id: socket.id,
    });
  });
  //check user was share his screen or not
  socket.on("check screen share", (payload) => {
    const { mentorUuid, studentId } = payload;
    if (screenShare[mentorUuid]) {
      io.to(screenShare[mentorUuid]).emit("mentor share screen", {
        studentId,
      });
    }
  });
  //mute status
  socket.on("video mute status", (payload) => {
    const { cameraStatus, mentorUuid } = payload;
    videoMute[mentorUuid] = cameraStatus;
    //video signal
    if (room[mentorUuid].length >= 1) {
      room[mentorUuid].forEach((studentUUid) => {
        io.to(UuidToStudentId[studentUUid]).emit("video signal", {
          cameraStatus,
        });
      });
    }
  });

  socket.on("mentor mute status", (payload) => {
    const { mute, mentorUuid } = payload;
    mutedMentor[mentorUuid] = mute;
    //video signal
    if (room[mentorUuid].length >= 1) {
      room[mentorUuid].forEach((studentUUid) => {
        io.to(UuidToStudentId[studentUUid]).emit("mute signal", {
          mute,
        });
      });
    }
  });

  //mute end
  socket.on("end meeting", (payload) => {
    const { mentorUUid } = payload;
    // room[mentorId] = [];
    delete idToRoom[socket.id];
    delete roomToId[mentorUUid];
    delete roomToName[mentorUUid];
    delete mentorStart[mentorUUid];
    delete mutedMentor[mentorUUid];
    delete videoMute[mentorUUid];

    if (mentorStaticId[socket.id]) {
      delete mentorStaticId[socket.id];
    }
    if (room[mentorUUid]) {
      room[mentorUUid].forEach((studentUuid) => {
        io.to(UuidToStudentId[studentUuid]).emit(
          "connected host leave",
          "data"
        );
        delete studentIdToUuid[UuidToStudentId[studentUuid]];
        delete UuidToStudentId[studentUuid];
      });
      delete room[mentorUUid];
    }
    socket.broadcast.emit("host take leave", {
      id: socket.id,
    });
  });
  socket.on("host take leave it clint side action", (payload) => {
    const { studentUuid } = payload;
    delete studentIdToUuid[socket.id];
    delete UuidToStudentId[studentUuid];
  });
  socket.on("student leave the meeting", (payload) => {
    const { studentId, mentorUuid } = payload;
    const afterLeave = room[mentorUuid].filter((user) => user !== studentId);
    room[mentorUuid] = afterLeave;
    delete studentIdToUuid[socket.id];
    delete UuidToStudentId[studentId];
  });
});
server.listen(process.env.PORT || 4000, () => {
  console.log("The port 4000 is ready to start....");
});
