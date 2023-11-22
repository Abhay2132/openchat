const $ = q => document.querySelector(q);

const socket = io();

socket.on("user-count", ({count=0})=>{
    const count_target = $('#user-count');
    if(!count_target) return;
    count_target.textContent = count;
})

socket.on("rtc", )

socket.on("log", console.log);