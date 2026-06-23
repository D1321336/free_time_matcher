//建立後端伺服器
//設定可以接收 JSON
//設定靜態網頁資料夾 public
//設定路由 routes

import './db.js';
import express from 'express';
import path from 'path'; 
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import coursesRouter from './routes/courses.js';
import groupsRouter from './routes/groups.js';
import eventsRouter from './routes/events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/courses', coursesRouter);
app.use('/groups', groupsRouter);
app.use('/events', eventsRouter);

export default app;
