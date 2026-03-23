import SwiftUI
import WidgetKit

// MARK: - Small Widget View (Bonus Tracker)

struct SmallWidgetView: View {
    let entry: Provider.Entry
    
    var body: some View {
        ZStack {
            // Glass background effect
            Color.clear
                .background(.ultraThinMaterial)
                .overlay(
                    Color(red: 30/255, green: 41/255, blue: 59/255).opacity(0.4)
                )
            
            VStack(spacing: 8) {
                // Header: Personal Solves (Primary Motivation)
                VStack(spacing: 0) {
                    Text("\(entry.data.personalSolves)")
                        .font(.system(size: 42, weight: .heavy, design: .rounded))
                        .foregroundColor(.green)
                        .shadow(color: .green.opacity(0.3), radius: 10, x: 0, y: 0)
                    
                    Text("YOU SOLVED")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.green.opacity(0.7))
                        .tracking(1)
                }
                
                // Footer: Team Goal (Secondary)
                HStack(spacing: 4) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 8))
                        .foregroundColor(.cyan)
                    
                    Text("\(entry.data.teamSolves) TEAM")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.05))
                .cornerRadius(10)
            }
            .padding()
        }
        .widgetURL(URL(string: entry.data.quickSearchUrl))
    }
}

// Preview
#Preview {
    SmallWidgetView(entry: SimpleEntry(date: .now, data: sampleWidgetData()))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .frame(width: 170, height: 170)
}
