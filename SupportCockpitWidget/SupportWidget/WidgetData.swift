import Foundation

// MARK: - Widget Data Model
// This matches the JSON structure exported by the Electron app

struct WidgetData: Codable {
    let lastUpdate: String
    let tickets: Int
    let completedMonth: Int
    let quickSearchUrl: String
    let stats: StatsData
    let slaWarnings: [SLAWarning]
    
    // New Fields for Rework
    let teamSolves: Int
    let personalSolves: Int
    let aiStats: Int
    
    // Enhanced Stats
    let leaderboardPosition: Int?
    let dailyAverage: Int
    let weeklyProgressPercent: Int
    
    struct StatsData: Codable {
        let intercom: IntercomStats
        let jira: JiraStats
        
        struct IntercomStats: Codable {
            let totalChats: Int
            let unassigned: Int
            let csatScore: Double
            let active: Int
        }
        
        struct JiraStats: Codable {
            let totalOpen: Int
            let reviews: Int
            let influence: Int
            let boost: Int
        }
    }
    
    struct SLAWarning: Codable, Identifiable {
        var id: String { key }
        let key: String
        let summary: String
        let timeRemaining: Int
        let timeRemainingFormatted: String
        let assignee: String
    }
}

// MARK: - Data Loading Helper

func loadWidgetData() -> WidgetData? {
    guard let containerURL = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: "group.supportcockpit.shared"
    ) else {
        return nil
    }
    
    let fileURL = containerURL.appendingPathComponent("widget-data.json")
    
    guard let data = try? Data(contentsOf: fileURL),
          let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data) else {
        return nil
    }
    
    return widgetData
}

// MARK: - Sample Data for Previews

func sampleWidgetData() -> WidgetData {
    WidgetData(
        lastUpdate: Date().ISO8601Format(),
        tickets: 12,
        completedMonth: 145,
        quickSearchUrl: "supportcockpit://search",
        stats: WidgetData.StatsData(
            intercom: WidgetData.StatsData.IntercomStats(
                totalChats: 127,
                unassigned: 8,
                csatScore: 4.6,
                active: 23
            ),
            jira: WidgetData.StatsData.JiraStats(
                totalOpen: 35,
                reviews: 15,
                influence: 8,
                boost: 12
            )
        ),
        slaWarnings: [
            WidgetData.SLAWarning(
                key: "REV-1234",
                summary: "Customer unable to see reviews widget",
                timeRemaining: 2700000,
                timeRemainingFormatted: "45m",
                assignee: "John Doe"
            )
        ],
        teamSolves: 450,
        personalSolves: 125,
        aiStats: 42,
        leaderboardPosition: 2,
        dailyAverage: 20,
        weeklyProgressPercent: 77
    )
}
