-- PostgreSQL version of drop tables script
-- Run with: psql -h localhost -p 5432 -U lportal -d tipp -f drop_tables.sql

DROP TABLE IF EXISTS tipp_SessionPlayers;
DROP TABLE IF EXISTS tipp_Predictions;
DROP TABLE IF EXISTS tipp_GameSessions;
DROP TABLE IF EXISTS tipp_Matches;
DROP TABLE IF EXISTS tipp_MatchResults;
DROP TABLE IF EXISTS tipp_Users;
DROP TABLE IF EXISTS tipp_Teams;
