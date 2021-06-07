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
let no_of_peers=0;
io.on('connection',socket=>{
    console.log('new connection!');
    const socketId=socket.id;
    polite=!polite;
    no_of_peers++;
    socket.join(room);
    io.to(socketId).emit('joined',{intro:`hello user you have joined the ${room}`,data:polite});
    if(no_of_peers==2){
        console.log(no_of_peers);
        io.to(room).emit('start','start');
    }
    socket.on('send',data=>{
        socket.broadcast.emit('message',data);
    });
    socket.on('disconnect', ()=>{
        no_of_peers--;
        io.to(room).emit('clear','clear');
    })
})


const PORT=process.env.PORT||3000;
server.listen(PORT, ()=> console.log('server started on ',PORT));