// Shared configuration values for data, layout, typography, and colors.
const CONFIG = {
  debug: false,
  debugTeam: 'cle',
  debugYear: null,
  api: {
    base: 'https://site.api.espn.com',
    teams: 'apis/site/v2/sports/football/nfl/teams'
  },
  ui: {
    padding: 3,
    titleSpacing: 0,
    spacing: 0,
    gameSplitIndex: 9,
    columnGap: 7,
    gameDateWidth: 51,
    gameMatchupWidth: 47,
    gameOutcomeWidth: 18,
    gameRowHeight: 12
  },
  fonts: {
    body: Font.systemFont(10),
    date: Font.regularMonospacedSystemFont(9),
    title: Font.boldSystemFont(18),
    record: Font.systemFont(9)
  },
  colors: {
    text: Color.white(),
    textSecondary: Color.dynamic(new Color('#ffffff', 0.7), new Color('#ffffff', 0.6)),
    gradientTop: Color.dynamic(new Color('#ffffff', 0.15), new Color('#000000', 0.2)),
    gradientBottom: Color.dynamic(new Color('#ffffff', 0.35), new Color('#000000', 0.4)),
    win: new Color('#4ade80'),
    loss: new Color('#f87171'),
    tie: new Color('#fbbf24')
  },
  teamsPrimaryColor: ['ARI', 'BUF', 'CHI', 'JAX', 'KC', 'MIN', 'PIT'],
  validTeams: ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAR', 'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYJ', 'NYG', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WSH']
}

// Device dimensions used by the background drawing context.
const DEVICE = {
  height: Device.screenSize().height,
  width: Device.screenSize().width
}

// Represents one scheduled game entry and its derived display fields.
class Game {
  constructor(date, competitors, gameStatus, myTeamId) {
    this.date = this.formatDate(date)
    this.matchup = this.formatMatchup(competitors, myTeamId)
    this.outcome = this.determineOutcome(competitors, gameStatus, myTeamId)
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${weekday}, ${month}/${day}`
  }

  formatMatchup(competitors, myTeamId) {
    const homeTeam = competitors.find(c => c.homeAway.toLowerCase() === 'home')
    const awayTeam = competitors.find(c => c.homeAway.toLowerCase() === 'away')

    return homeTeam.id === myTeamId ? `vs ${awayTeam.team.abbreviation}` : `at ${homeTeam.team.abbreviation}`
  }

  determineOutcome(competitors, gameStatus, myTeamId) {
    if (gameStatus !== 'STATUS_FINAL') return null

    const myTeam = competitors.find(c => c.id === myTeamId)
    const otherTeam = competitors.find(c => c.id !== myTeamId)

    if (!myTeam.winner && !otherTeam.winner) return 'T'
    return myTeam.winner ? 'W' : 'L'
  }

}

// Fetches and stores a season schedule for a specific team.
class Schedule {
  constructor(teamId, seasonYear = null) {
    this.teamId = teamId
    this.seasonYear = seasonYear
    this.events = []
    this.year = null
  }

  async fetch() {
    const seasonQuery = this.seasonYear ? `?season=${this.seasonYear}` : ''
    const url = `${CONFIG.api.base}/${CONFIG.api.teams}/${this.teamId}/schedule${seasonQuery}`
    const request = new Request(url)
    const result = await request.loadJSON()

    if (result.status === 'success') {
      this.year = result.season.year
      this.events = result.events.map(event =>
        new Game(
          event.date,
          event.competitions[0].competitors,
          event.competitions[0].status.type.name,
          this.teamId
        )
      )
    }
  }

  get recordSummary() {
    const wins = this.events.filter(e => e.outcome === 'W').length
    const losses = this.events.filter(e => e.outcome === 'L').length
    const ties = this.events.filter(e => e.outcome === 'T').length
    if (wins + losses + ties === 0) return null
    return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
  }
}

// Fetches team metadata and caches logos locally.
class Team {
  async fetchData(abbreviation, seasonYear = null) {
    const url = `${CONFIG.api.base}/${CONFIG.api.teams}/${abbreviation}`
    const request = new Request(url)
    const result = await request.loadJSON()
    const teamData = result.team

    if (teamData) {
      this.abbreviation = teamData.abbreviation
      this.alternateColor = `#${teamData.alternateColor}`
      this.color = `#${teamData.color}`
      this.displayName = teamData.displayName
      this.id = teamData.id
      this.location = teamData.location
      this.name = teamData.name
      this.nickname = teamData.nickname
      this.logoUrl = teamData.logos[0].href
      this.logo = await this.downloadLogo()

      this.schedule = new Schedule(teamData.id, seasonYear)
      await this.schedule.fetch()
    }
  }

  async downloadLogo() {
    const fileManager = FileManager.local()
    const cacheDir = fileManager.documentsDirectory()
    const cachePath = fileManager.joinPath(cacheDir, `${this.id}_${this.abbreviation}_logo`)

    if (fileManager.fileExists(cachePath)) {
      return fileManager.readImage(cachePath)
    }

    const request = new Request(this.logoUrl)
    const image = await request.loadImage()
    fileManager.writeImage(cachePath, image)
    return image
  }

  getBackgroundColor() {
    const usesPrimaryColor = CONFIG.teamsPrimaryColor.includes(this.abbreviation.toUpperCase())
    return usesPrimaryColor ? this.color : this.alternateColor
  }
}

// Builds the widget UI layout and visual styling.
class WidgetDisplay {
  constructor() {
    this.widget = new ListWidget()
  }

  async render(team) {
    // Build the two-column header row: logo on left, content on right.
    this.setupBackground(team.getBackgroundColor())

    const contentRow = this.widget.addStack()
    contentRow.layoutHorizontally()
    contentRow.topAlignContent()

    const logoColumn = contentRow.addStack()
    logoColumn.layoutVertically()
    const logo = logoColumn.addImage(team.logo)
    logo.imageSize = new Size(22, 22)
    logo.imageOpacity = 1

    contentRow.addSpacer(6)

    const contentColumn = contentRow.addStack()
    contentColumn.layoutVertically()
    contentColumn.spacing = 0

    this.addTitle(contentColumn, team)
    this.addSchedule(contentColumn, team)

    return this.widget
  }

  setupBackground(backgroundColor) {
    // Paint a team-colored background and apply the overlay gradient.
    const context = new DrawContext()
    const rect = new Rect(0, 0, DEVICE.width * 2, DEVICE.height * 2)

    context.size = new Size(DEVICE.width * 2, DEVICE.height)
    context.setFillColor(new Color(backgroundColor))
    context.fillRect(rect)

    const gradient = new LinearGradient()
    gradient.locations = [0, 1]
    gradient.colors = [CONFIG.colors.gradientTop, CONFIG.colors.gradientBottom]

    this.widget.setPadding(CONFIG.ui.padding, CONFIG.ui.padding, CONFIG.ui.padding, CONFIG.ui.padding)
    this.widget.backgroundColor = new Color(backgroundColor)
    this.widget.backgroundImage = context.getImage()
    this.widget.backgroundGradient = gradient
  }

  addTitle(parentStack, team) {
    // Render title and record line above the schedule grid.
    const titleStack = parentStack.addStack()
    titleStack.layoutVertically()
    titleStack.spacing = 0

    const mainTitleStack = titleStack.addStack()
    mainTitleStack.layoutHorizontally()
    mainTitleStack.topAlignContent()

    const title = mainTitleStack.addText(team.displayName)
    title.font = CONFIG.fonts.title
    title.textColor = CONFIG.colors.text

    if (team.schedule.recordSummary) {
      mainTitleStack.addSpacer(3)

      const recordStack = mainTitleStack.addStack()
      recordStack.layoutVertically()
      recordStack.addSpacer(4)

      const recordText = recordStack.addText(team.schedule.recordSummary)
      recordText.font = CONFIG.fonts.record
      recordText.textColor = CONFIG.colors.textSecondary
    }

    const divider = titleStack.addText('─'.repeat(12))
    divider.font = Font.systemFont(7)
    divider.textColor = CONFIG.colors.textSecondary
    divider.lineLimit = 1

    titleStack.addSpacer(CONFIG.ui.titleSpacing)
  }

  addSchedule(parentStack, team) {
    // Split schedule entries into two vertical columns.
    const wrapperStack = parentStack.addStack()
    wrapperStack.layoutHorizontally()
    wrapperStack.spacing = CONFIG.ui.columnGap

    const leftStack = wrapperStack.addStack()
    leftStack.layoutVertically()
    leftStack.spacing = CONFIG.ui.spacing

    const rightStack = wrapperStack.addStack()
    rightStack.layoutVertically()
    rightStack.spacing = CONFIG.ui.spacing

    team.schedule.events.forEach((game, index) => {
      const target = index < CONFIG.ui.gameSplitIndex ? leftStack : rightStack
      this.addGameRow(target, game)
    })
  }

  addGameRow(stack, game) {
    // Render fixed-width date/matchup/outcome columns for alignment.
    const row = stack.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    row.size = new Size(0, CONFIG.ui.gameRowHeight)

    const dateColumn = row.addStack()
    dateColumn.size = new Size(CONFIG.ui.gameDateWidth, CONFIG.ui.gameRowHeight)
    dateColumn.centerAlignContent()

    const dateText = dateColumn.addText(game.date)
    dateText.font = CONFIG.fonts.date
    dateText.textColor = CONFIG.colors.textSecondary
    dateText.lineLimit = 1

    row.addSpacer(3)

    const matchupColumn = row.addStack()
    matchupColumn.size = new Size(CONFIG.ui.gameMatchupWidth, CONFIG.ui.gameRowHeight)
    matchupColumn.centerAlignContent()

    const matchupText = matchupColumn.addText(game.matchup)
    matchupText.font = CONFIG.fonts.body
    matchupText.textColor = CONFIG.colors.text
    matchupText.lineLimit = 1

    row.addSpacer(5)

    const outcomeContainer = row.addStack()
    outcomeContainer.size = new Size(CONFIG.ui.gameOutcomeWidth, CONFIG.ui.gameRowHeight)
    outcomeContainer.centerAlignContent()

    if (game.outcome) {
      const outcomeColor = game.outcome === 'W' ? CONFIG.colors.win
        : game.outcome === 'L' ? CONFIG.colors.loss
        : CONFIG.colors.tie

      const pill = outcomeContainer.addStack()
      pill.backgroundColor = outcomeColor
      pill.cornerRadius = 3
      pill.setPadding(1, 3, 1, 3)
      pill.centerAlignContent()

      const outcomeText = pill.addText(game.outcome)
      outcomeText.font = Font.boldSystemFont(7)
      outcomeText.textColor = new Color('#000000')
    }
  }
}

// Parses widget input and drives end-to-end execution.
class Application {
  constructor() {
    this.validateEnvironment()
  }

  validateEnvironment() {
    if (!args.widgetParameter && !CONFIG.debug) {
      throw 'Please provide TEAM_ABBREVIATION or TEAM_ABBREVIATION,YEAR (Long tap > Edit Widget > Parameter)'
    }

    const rawParameter = CONFIG.debug
      ? `${CONFIG.debugTeam}${CONFIG.debugYear ? `,${CONFIG.debugYear}` : ''}`
      : args.widgetParameter

    const parameterParts = rawParameter
      .split(',')
      .map(part => part.trim())

    if (parameterParts.length > 2 || !parameterParts[0]) {
      throw `Invalid widget parameter '${rawParameter}'. Use TEAM_ABBREVIATION or TEAM_ABBREVIATION,YEAR`
    }

    const teamAbrev = parameterParts[0].toUpperCase()
    const seasonYearInput = parameterParts[1]

    if (!CONFIG.validTeams.includes(teamAbrev?.toUpperCase())) {
      throw `Invalid team abbreviation: '${teamAbrev}'. Must be one of: ${CONFIG.validTeams.join(', ')}`
    }

    if (seasonYearInput !== undefined && !/^\d{4}$/.test(seasonYearInput)) {
      throw `Invalid year '${seasonYearInput}'. Year must be 4 digits, for example 2024`
    }

    this.teamAbbreviation = teamAbrev?.toUpperCase()
    this.seasonYear = seasonYearInput ? Number(seasonYearInput) : null
  }

  async run() {
    const team = new Team()
    await team.fetchData(CONFIG.debug ? CONFIG.debugTeam : this.teamAbbreviation, this.seasonYear)

    const display = new WidgetDisplay()
    const widget = await display.render(team)

    if (!config.runsInWidget) {
      await widget.presentMedium()
    }

    Script.setWidget(widget)
    Script.complete()
  }
}

const app = new Application()
await app.run()
