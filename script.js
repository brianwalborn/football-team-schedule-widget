class Display {
    constructor() {
        this.widget = new ListWidget()
    }

    addTextToStack(stack, text) {
        let line = stack.addText(text)

        line.textColor = Color.white()
        line.font = Font.regularMonospacedSystemFont(10)
    }

    async create(team) {
        this.initializeDisplay(team.color)
        this.formatTitleStack(team, this.formatLogoStack(team.logo))
        
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

    formatLogoStack(image) {
        let stack = this.widget.addStack()
        const logo = stack.addImage(image)

        logo.imageSize = new Size(20, 20)

        stack.layoutHorizontally()
        stack.addSpacer(8)
        
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

    formatTitleStack(team, logoStack) {
        let titleStack = logoStack.addStack()
        titleStack.layoutVertically()

        let titleText = titleStack.addStack()
        let title = titleText.addText(`${team.schedule.year} ${team.displayName} (${team.schedule.recordSummary})`)
        title.font = Font.mediumRoundedSystemFont(13)
        title.textColor = Color.white()
        titleText.setPadding(2, 0, 0, 0)
    }

    formatWrapperStack() {
        let stack = this.widget.addStack()

        stack.layoutHorizontally()

        return stack
    }

    initializeDisplay(backgroundColor) {
        this.widget.setPadding(10, 10, 10, 10)
        this.widget.backgroundColor = new Color(backgroundColor)
    }
}

class Game {
    constructor(date, matchup, competitors, gameStatus, myTeamId) {
        this.date = this.formatDate(date)
        this.matchup = matchup
        this.outcome = this.getOutcome(competitors, gameStatus, myTeamId)
    }

    formatDate(date) {
        let unformattedDate = new Date(date)

        return unformattedDate.toLocaleDateString('en-us', {weekday:'short', month:'short', day:'2-digit'})
    }

    getOutcome(competitors, gameStatus, myTeamId) {
        let outcome = null
	
        if (gameStatus == 'STATUS_FINAL') {
            let winner = []
            
            for (let competitor in competitors) { winner.push(competitors[competitor].winner) }
            
            // if neither team has won, it's a tie
            if(!winner[0] && !winner[1]) { return 'T' }
            
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
        let request = new Request(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${this.teamId}/schedule`)
        let result = await request.loadJSON()
        let schedule = []
	
        if (result.status == 'success') {
            this.recordSummary = result.team.recordSummary
            this.year = result.season.year

            for (let event in result.events) {
                let game = result.events[event]
                
                schedule.push(new Game(game.date, game.shortName, game.competitions[0].competitors, game.competitions[0].status.type.name, this.teamId))
            }
        }
        
        this.events = schedule
    }
}

class Team {
    async downloadLogo() {
        let fm = FileManager.local()
        let dir = fm.documentsDirectory()
        let path = fm.joinPath(dir, this.id)
        
        if (fm.fileExists(path)) {
            return fm.readImage(path)
        } 
        else {
            // download once
            let iconImage = await loadImage(this.logoUrl)

            fm.writeImage(path, iconImage)
            
            return iconImage
        }
    }

    async fetchTeamData(teamAbbreviation) {
        let request = new Request('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams')
        let result = await request.loadJSON()
        let list = result.sports[0].leagues[0].teams
        let team = null
            
        for (let item in list) {
            if (teamAbbreviation.toLowerCase() == list[item].team.abbreviation.toLowerCase()) { team = list[item].team }
        }

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
        let team = new Team()

        await team.fetchTeamData('CLE')//(args.widgetParameter)

        let display = new Display()

        await display.create(team)

        if (!config.runsInWidget) {	await display.widget.presentMedium() }

        Script.setWidget(display.widget)
        Script.complete()
    }
}

let executor = new Main()
await executor.execute()
