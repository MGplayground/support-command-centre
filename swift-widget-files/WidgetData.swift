import Foundation

// MARK: - Widget Data Model
// This matches the JSON structure exported by the Electron app

struct WidgetData: Codable {
    let lastUpdate: String
    let bonus: BonusData
    let stats: StatsData
    let slaWarnings: [SLAWarning]
    
    struct BonusData: Codable {
        let amount: Double
        let ticketsClosed: Int
        let isOnFire: Bool
    }
    
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
    
    struct SLAWarning: Codable {
        let key: String
        let summary: String
        let timeRemaining: Int
        let timeRemainingFormatted: String
        let assignee: String
    }
}

// MARK: - Data Loading Helper

func loadWidgetData() -> WidgetData? {
    let fileManager = FileManager.default
    
    // Get shared container URL
    guard let containerURL = fileManager.containerURL(
        forSecurityApplicationGroupIdentifier: "group.supportcockpit.shared"
    ) else {
        print("[Widget] ❌ Failed to get container URL")
        return nil
    }
    
    let fileURL = containerURL.appendingPathComponent("widget-data.json")
    
    do {
        let data = try Data(contentsOf: fileURL)
        let decoder = JSONDecoder()
        let widgetData = try decoder.decode(WidgetData.self, from: data)
        print("[Widget] ✅ Data loaded successfully")
        return widgetData
    } catch {
        print("[Widget] ❌ Error loading widget data: \\(error)")
        return nil
    }
}

// MARK: - Sample Data for Previews

func sampleWidgetData() -> WidgetData {
    WidgetData(
        lastUpdate: Date().ISO8601Format(),
        bonus: WidgetData.BonusData(
            amount: 36.00,
            ticketsClosed: 18,
            isOnFire: false
        ),
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
        ]
    )
}
