const DEBUG = false
const DEBUG_TEAM = "ala"
const DEVICE_HEIGHT = Device.screenSize().height
const DEVICE_WIDTH = Device.screenSize().width
const FONT_BODY = Font.systemFont(10)
const FONT_COLOR = Color.white()
const FONT_TITLE = Font.boldSystemFont(14)
const GRADIENT_OVERLAY_TOP = Color.dynamic(new Color("#fefefe", 0.3), new Color("#2c2c2c", 0.3))
const GRADIENT_OVERLAY_BOTTOM = Color.dynamic(new Color("#fefefe", 0.7), new Color("#2c2c2c", 0.7))
const TEAMS_API_BASE_URL = "https://site.api.espn.com"
const TEAMS_API_PATH = "apis/site/v2/sports/football/college-football/teams"
const USE_TEAM_PRIMARY_COLOR_BACKGROUND = false

class Display {
  constructor() {
    this.widget = new ListWidget()
  }

  addTextToStack(stack, text) {
    let line = stack.addText(text)

    line.textColor = FONT_COLOR
    line.font = FONT_BODY
  }

  async create(team) {
    this.initializeDisplay(USE_TEAM_PRIMARY_COLOR_BACKGROUND ? team.color : team.alternateColor, team.logo)
    this.formatTitleStack(team)

    let wrapperStack = this.formatWrapperStack()
    let leftStack = this.formatLeftStack(wrapperStack)
    let rightStack = this.formatRightStack(wrapperStack)

    for (let item in team.schedule.events) {
      let game = team.schedule.events[item]
      let text = `${game.date} ${game.matchup}`

      if (game.outcome !== null) { text += ` (${game.outcome})` }

      if (item < 9) { this.addTextToStack(leftStack, text) }
      else { this.addTextToStack(rightStack, text) }
    }
  }

  formatLeftStack(wrapperStack) {
    let stack = wrapperStack.addStack()

    stack.layoutVertically()
    stack.addSpacer(2)
    stack.spacing = 1

    return stack
  }

  formatRightStack(wrapperStack) {
    let stack = wrapperStack.addStack()

    stack.layoutVertically()
    stack.addSpacer(2)
    stack.spacing = 1
    stack.setPadding(0, 8, 0, 0)

    return stack
  }

  formatTitleStack(team) {
    let titleStack = this.widget.addStack()
    titleStack.layoutVertically()

    let titleText = titleStack.addStack()
    let titleString = team.displayName

    if (team.schedule.recordSummary !== undefined) {
      titleString = titleString + ` (${team.schedule.recordSummary})`
    }

    let title = titleText.addText(titleString)

    title.font = FONT_TITLE
    title.textColor = FONT_COLOR
    titleText.setPadding(2, 0, 0, 0)
  }

  formatWrapperStack() {
    let stack = this.widget.addStack()

    stack.layoutHorizontally()

    return stack
  }

  initializeDisplay(backgroundColor, backgroundImage) {
    let draw = new DrawContext()
    let gradient = new LinearGradient()
    let rect = new Rect(0, 0, DEVICE_HEIGHT * 2, DEVICE_WIDTH * 2)

    draw.size = new Size(DEVICE_WIDTH * 2, DEVICE_HEIGHT)
    draw.strokeRect(rect)
    draw.setFillColor(new Color(backgroundColor))
    draw.fillRect(rect)
    draw.drawImageAtPoint(backgroundImage, new Point(DEVICE_WIDTH / 2.75, DEVICE_HEIGHT / 5))

    gradient.locations = [0, 1]
    gradient.colors = [GRADIENT_OVERLAY_TOP, GRADIENT_OVERLAY_BOTTOM]

    this.widget.setPadding(5, 5, 5, 5)
    this.widget.backgroundColor = new Color(backgroundColor)
    this.widget.backgroundImage = draw.getImage()
    this.widget.backgroundGradient = gradient
  }
}

class Game {
  constructor(date, competitors, gameStatus, myTeamId) {
    this.date = this.formatDate(date)
    this.matchup = this.formatMatchup(competitors, myTeamId)
    this.outcome = this.getOutcome(competitors, gameStatus, myTeamId)
  }

  formatDate(date) {
    let unformattedDate = new Date(date)

    return unformattedDate.toLocaleDateString('en-us', { weekday: 'short', month: 'short', day: '2-digit' })
  }

  formatMatchup(competitors, myTeamId) {
    var homeTeam = competitors.filter((x) => x.homeAway.toLowerCase() == "home")[0]
    var awayTeam = competitors.filter((x) => x.homeAway.toLowerCase() == "away")[0]

    if (homeTeam.id == myTeamId) {
      return `vs ${awayTeam.team.abbreviation}`
    }
    else {
      return `at ${homeTeam.team.abbreviation}`
    }
  }

  getOutcome(competitors, gameStatus, myTeamId) {
    let outcome = null

    if (gameStatus == 'STATUS_FINAL') {
      let winner = []

      for (let competitor in competitors) { winner.push(competitors[competitor].winner) }

      // if neither team has won, it's a tie
      if (!winner[0] && !winner[1]) { return 'T' }

      for (let competitor in competitors) {
        if (competitors[competitor].id == myTeamId) {
          outcome = competitors[competitor].winner ? 'W' : 'L'
        }
      }
    }

    return outcome
  }
}

class Schedule {
  constructor(teamId) {
    this.teamId = teamId
  }

  async fetchTeamSchedule() {
    let request = new Request(`${TEAMS_API_BASE_URL}/${TEAMS_API_PATH}/${this.teamId}/schedule`)
    let result = await request.loadJSON()
    let schedule = []

    if (result.status == 'success') {
      this.recordSummary = result.team.recordSummary
      this.year = result.season.year

      for (let event in result.events) {
        let game = result.events[event]

        schedule.push(new Game(game.date, game.competitions[0].competitors, game.competitions[0].status.type.name, this.teamId))
      }
    }

    this.events = schedule
  }
}

class Team {
  async downloadLogo() {
    let fm = FileManager.local()
    let dir = fm.documentsDirectory()
    let path = fm.joinPath(dir, `${this.id}_${this.abbreviation}_x`)

    if (fm.fileExists(path)) {
      return fm.readImage(path)
    }
    else {
      // download once
      var request = new Request(this.logoUrl)
      let iconImage = await request.loadImage()

      fm.writeImage(path, iconImage)

      return iconImage
    }
  }

  async fetchTeamData(teamAbbreviation) {
    let request = new Request(`${TEAMS_API_BASE_URL}/${TEAMS_API_PATH}/${teamAbbreviation}`)
    let result = await request.loadJSON()
    let team = result.team

    if (team) {
      this.abbreviation = team.abbreviation
      this.alternateColor = `#${team.alternateColor}`
      this.color = `#${team.color}`
      this.displayName = team.displayName
      this.id = team.id
      this.location = team.location
      this.logoUrl = team.logos[0].href
      this.logo = await this.downloadLogo()
      this.name = team.name
      this.nickname = team.nickname
      this.schedule = new Schedule(team.id)

      await this.schedule.fetchTeamSchedule()
    }
  }
}

class Main {
  async execute() {
    if (!args.widgetParameter && !DEBUG) { throw 'Please provide a team abbreviation (Long tap > Edit Widget > Parameter)' }

    let display = new Display()
    let team = new Team()

    await team.fetchTeamData(DEBUG ? DEBUG_TEAM : args.widgetParameter)

    await display.create(team)

    if (!config.runsInWidget) { await display.widget.presentMedium() }

    Script.setWidget(display.widget)
    Script.complete()
  }
}

let executor = new Main()
await executor.execute()
