use tipp;
go
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_SessionPlayers') DROP TABLE tipp_SessionPlayers;
go
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Predictions') DROP TABLE tipp_Predictions;
go
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_GameSessions') DROP TABLE tipp_GameSessions;
go
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Matches') DROP TABLE tipp_Matches;
go
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_MatchResults') DROP TABLE tipp_MatchResults;
go
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Users') DROP TABLE tipp_Users;
go
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Teams') DROP TABLE tipp_Teams;
go
