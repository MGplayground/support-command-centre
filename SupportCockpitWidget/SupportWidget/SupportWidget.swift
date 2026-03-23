import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    typealias Entry = SimpleEntry

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: sampleWidgetData())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(
            date: Date(),
            data: loadWidgetData() ?? sampleWidgetData()
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()
        
        // Load data from shared container
        let data = loadWidgetData() ?? sampleWidgetData()
        let entry = SimpleEntry(date: currentDate, data: data)
        
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(
            byAdding: .minute,
            value: 15,
            to: currentDate
        )!
        
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// MARK: - Widget Configuration


struct SupportWidget: Widget {
    let kind: String = "SupportWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(macOS 14.0, *) {
                SupportWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                SupportWidgetEntryView(entry: entry)
                    .background()
            }
        }
        .configurationDisplayName("Support Cockpit")
        .description("Live support metrics and bonus tracker")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Entry View (Router)

struct SupportWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    SupportWidget()
} timeline: {
    SimpleEntry(date: .now, data: sampleWidgetData())
}

#Preview(as: .systemMedium) {
    SupportWidget()
} timeline: {
    SimpleEntry(date: .now, data: sampleWidgetData())
}
