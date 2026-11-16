// What every part of the live layer agrees on: where browsers meet, and how far a voice carries.

export const PREFIX = 'pop2';
export const RELAYS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
export const CELL = 300; // metres; you get movement and speech from your cell and its neighbours
export const HEAR = 60; // metres: how far a spoken message carries
