const express = require("express");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "degistir-bu-sifre";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new Database(process.env.DB_PATH || "hali_saha.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS players (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 phone TEXT,
 preference TEXT DEFAULT 'any',
 active INTEGER DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS weeks (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 match_date TEXT NOT NULL,
 match_time TEXT NOT NULL,
 location TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS attendance (
 week_id INTEGER NOT NULL,
 player_id INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 team TEXT DEFAULT 'any',
 PRIMARY KEY (week_id, player_id)
);
`);

function currentWeek() {
  return db.prepare("SELECT * FROM weeks ORDER BY id DESC LIMIT 1").get();
}
function seed() {
  if (!currentWeek()) {
    const info = db.prepare("INSERT INTO weeks(match_date,match_time,location) VALUES(?,?,?)")
      .run("2026-10-03","21:00","Halı Saha (Merkez)");
  }
}
seed();

app.get("/api/state", (req,res)=>{
  const week=currentWeek();
  const players=db.prepare("SELECT * FROM players WHERE active=1 ORDER BY id").all();
  const attendance=db.prepare("SELECT * FROM attendance WHERE week_id=?").all(week.id);
  res.json({week,players,attendance});
});

app.post("/api/admin/players", (req,res)=>{
  if(req.headers["x-admin-key"]!==ADMIN_KEY) return res.status(401).json({error:"Yetkisiz"});
  const {name,phone="",preference="any"}=req.body;
  if(!name?.trim()) return res.status(400).json({error:"İsim gerekli"});
  const info=db.prepare("INSERT INTO players(name,phone,preference) VALUES(?,?,?)")
    .run(name.trim(),phone,preference);
  res.json({id:info.lastInsertRowid});
});

app.delete("/api/admin/players/:id",(req,res)=>{
  if(req.headers["x-admin-key"]!==ADMIN_KEY) return res.status(401).json({error:"Yetkisiz"});
  db.prepare("UPDATE players SET active=0 WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.post("/api/admin/week",(req,res)=>{
  if(req.headers["x-admin-key"]!==ADMIN_KEY) return res.status(401).json({error:"Yetkisiz"});
  const {match_date,match_time,location}=req.body;
  if(!match_date||!match_time||!location) return res.status(400).json({error:"Tüm alanlar gerekli"});
  const info=db.prepare("INSERT INTO weeks(match_date,match_time,location) VALUES(?,?,?)")
    .run(match_date,match_time,location);
  res.json({id:info.lastInsertRowid});
});

app.post("/api/attendance",(req,res)=>{
  const {player_id,status,team="any"}=req.body;
  const week=currentWeek();
  const player=db.prepare("SELECT * FROM players WHERE id=? AND active=1").get(player_id);
  if(!player) return res.status(404).json({error:"Oyuncu bulunamadı"});
  if(!["yes","no"].includes(status)) return res.status(400).json({error:"Geçersiz durum"});
  db.prepare(`INSERT INTO attendance(week_id,player_id,status,team)
              VALUES(?,?,?,?)
              ON CONFLICT(week_id,player_id) DO UPDATE SET status=excluded.status,team=excluded.team`)
    .run(week.id,player_id,status,team);
  res.json({ok:true});
});

app.get("/api/lineup",(req,res)=>{
  const week=currentWeek();
  const players=db.prepare(`
    SELECT p.*, COALESCE(a.status,'pending') status, COALESCE(a.team,'any') team
    FROM players p LEFT JOIN attendance a ON a.player_id=p.id AND a.week_id=?
    WHERE p.active=1 ORDER BY p.id
  `).all(week.id);

  const attending=players.filter(p=>p.status==="yes");
  // Rotation fairness: lower total starts gets priority, then player id.
  const history=db.prepare(`
    SELECT p.id,
      SUM(CASE WHEN a.status='yes' THEN 1 ELSE 0 END) appearances
    FROM players p LEFT JOIN attendance a ON a.player_id=p.id
    WHERE p.active=1 GROUP BY p.id
  `).all();
  const counts=new Map(history.map(x=>[x.id,x.appearances||0]));

  attending.sort((a,b)=>(counts.get(a.id)||0)-(counts.get(b.id)||0) || a.id-b.id);

  const selected=attending.slice(0,14);
  const bench=attending.slice(14);

  const white=[], black=[];
  // Honor explicit preferences first, then balance.
  for(const p of selected){
    if(p.team==="white" && white.length<7) white.push(p);
    else if(p.team==="black" && black.length<7) black.push(p);
  }
  for(const p of selected){
    if(white.includes(p)||black.includes(p)) continue;
    if(white.length<=black.length && white.length<7) white.push(p);
    else if(black.length<7) black.push(p);
    else white.push(p);
  }
  res.json({week,white,black,bench,notComing:players.filter(p=>p.status==="no"),pending:players.filter(p=>p.status==="pending")});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Halı Saha Grubu ${PORT} portunda çalışıyor.`));
