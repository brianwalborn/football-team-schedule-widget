# football-team-schedule-widget

Display any NCAAF/NFL team's schedule on iOS using the [Scriptable](https://scriptable.app/) app.

![scriptable01](img/scriptable01.png)

## Setup

1. Download the [Scriptable](https://scriptable.app/) app from the app store
2. Create a new script in the Scriptable app
3. Copy & paste the code from [ncaaf-script.js](https://raw.githubusercontent.com/brianwalborn/football-team-schedule-widget/main/ncaaf-script.js) or [nfl-script.js](https://raw.githubusercontent.com/brianwalborn/football-team-schedule-widget/main/nfl-script.js) into the newly created script
4. Create a new widget on your homescreen, select the newly created script, and pass in a valid team abbreviation.
  - NCAAF: too many to list, and is much more forgiving than the NFL widget (for example: for Clemson both `clem` and `clemson` can be used, for Kentucky both `uk` and `kentucky` can be used, Ohio State is `ohiost`, Oregon State is `oregonst`, Oklahoma State is `okst`, so on and so forth)
  - NFL: `ARI`, `ATL`, `BAL`, `BUF`, `CAR`, `CHI`, `CIN`, `CLE`, `DAL`, `DEN`, `DET`, `GB`, `HOU`, `IND`, `JAX`, `KC`, `LAR`, `LAC`, `LV`, `MIA`, `MIN`, `NE`, `NO`, `NYJ`, `NYG`, `PHI`, `PIT`, `SEA`, `SF`, `TB`, `TEN`, `WAS`

## Caveats

- If you're unable to see your NCAA team's logo in the background (the schedule is showing but the background is a solid color) or if you simply want to try anothe team color, try replacing `const USE_TEAM_PRIMARY_COLOR_BACKGROUND = false` in the `ncaaf-script.js` with `const USE_TEAM_PRIMARY_COLOR_BACKGROUND = true`

![scriptable02](img/scriptable02.png)
![scriptable03](img/scriptable03.png)
