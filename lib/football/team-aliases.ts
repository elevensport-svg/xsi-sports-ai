/*
 * Football Team Alias V1
 *
 * 將賽程 API 的球隊名稱轉成 football-data.co.uk
 * 歷史資料使用的名稱。
 *
 * 只放已明確確認的名稱，不做模糊自動配對。
 */

const FOOTBALL_TEAM_ALIASES:
  Record<
    string,
    string
  > = {
  "AC Milan":
    "Milan",

  "Atlético Madrid":
    "Ath Madrid",

  "Atalanta BC":
    "Atalanta",

  "Athletic Bilbao":
    "Ath Bilbao",

  "Brighton and Hove Albion":
    "Brighton",

  "CA Osasuna":
    "Osasuna",

  "Celta Vigo":
    "Celta",

  "Elche CF":
    "Elche",

  "Inter Milan":
    "Inter",

  "Leeds United":
    "Leeds",

  "Manchester City":
    "Man City",

  "Manchester United":
    "Man United",

  "Newcastle United":
    "Newcastle",

  "Nottingham Forest":
    "Nott'm Forest",

  "Paris Saint Germain":
    "Paris SG",

  "Rayo Vallecano":
    "Vallecano",

  "Real Betis":
    "Betis",

  "Real Sociedad":
    "Sociedad",

  "Tottenham Hotspur":
    "Tottenham",
};

function normalizeAliasKey(
  value:
    string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

const NORMALIZED_ALIAS_MAP =
  new Map<
    string,
    string
  >(
    Object.entries(
      FOOTBALL_TEAM_ALIASES,
    ).map(
      (
        [
          apiName,
          historyName,
        ],
      ) => [
        normalizeAliasKey(
          apiName,
        ),
        historyName,
      ],
    ),
  );

export function getFootballHistoryTeamName(
  teamName:
    string,
) {
  return (
    FOOTBALL_TEAM_ALIASES[
      teamName
    ] ??
    NORMALIZED_ALIAS_MAP.get(
      normalizeAliasKey(
        teamName,
      ),
    ) ??
    teamName
  );
}

export {
  FOOTBALL_TEAM_ALIASES,
};