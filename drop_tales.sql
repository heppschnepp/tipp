-- PostgreSQL version of drop tables script
-- Run with: psql -h localhost -p 5432 -U lportal -d tipp -f drop_tables.sql

DROP TABLE IF EXISTS tipp_sessionplayers;
DROP TABLE IF EXISTS tipp_predictions;
DROP TABLE IF EXISTS tipp_gamesessions;
DROP TABLE IF EXISTS tipp_matches;
DROP TABLE IF EXISTS tipp_matchresults;
DROP TABLE IF EXISTS tipp_users;
DROP TABLE IF EXISTS tipp_teams;