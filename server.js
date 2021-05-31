const express=require("express");
const path= require("path");
const http=require("http");
const socketio=require("socket.io");

const app=express();
const server=http.createServer(app);
const io=socketio(server);

app.use(express.static(path.join(__dirname,"public")));

const room='signalling_room';
let polite=false;
io.on('connection',socket=>{
    console.log('new connection!');
    polite=!polite;
    socket.join(room);
    io.to(room).emit('joined',{intro:`hello user you have joined the ${room}`,data:polite});
    socket.on('send',data=>{
        socket.broadcast.emit('message',data);
    });
})


const PORT=process.env.PORT||3000;
server.listen(PORT, ()=> console.log('server started on ',PORT));
