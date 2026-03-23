import SwiftUI
import WidgetKit

// MARK: - Medium Widget View (Simplified: Monthly Focus)

struct MediumWidgetView: View {
    let entry: Provider.Entry
    
    var body: some View {
        ZStack {
            // Glass background
            Color.clear
                .background(.ultraThinMaterial)
                .overlay(
                    Color(red: 30/255, green: 41/255, blue: 59/255).opacity(0.4)
                )
            
            VStack(spacing: 0) {
                // Main Stats Area
                HStack(spacing: 0) {
                    // LEFT: YOU (Hero)
                    VStack(spacing: 2) {
                        Text("YOU")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.green.opacity(0.8))
                            .tracking(1)
                        
                        Text("\(entry.data.personalSolves)")
                            .font(.system(size: 34, weight: .heavy, design: .rounded))
                            .foregroundColor(.green)
                            .shadow(color: .green.opacity(0.3), radius: 10, x: 0, y: 0)
                        
                        HStack(spacing: 3) {
                            Text("\(entry.data.dailyAverage)/day")
                                .font(.system(size: 7, weight: .semibold))
                                .foregroundColor(.white.opacity(0.5))
                            Text("•")
                                .font(.system(size: 6, weight: .bold))
                                .foregroundColor(.white.opacity(0.3))
                            Text("\(entry.data.weeklyProgressPercent)%")
                                .font(.system(size: 7, weight: .bold))
                                .foregroundColor(.green.opacity(0.7))
                        }
                            
                        Text("SOLVED (DEC)")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .frame(maxWidth: .infinity)
                    .background(Color.white.opacity(0.03))
                    
                    // Divider
                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 1)
                        .padding(.vertical, 10)
                    
                    // RIGHT: TEAM (Context)
                    VStack(spacing: 2) {
                        Text("TEAM")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.cyan.opacity(0.8))
                            .tracking(1)
                        
                        Text("\(entry.data.teamSolves)")
                            .font(.system(size: 34, weight: .heavy, design: .rounded))
                            .foregroundColor(.cyan)
                        
                        Text("WEEKLY")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .frame(maxWidth: .infinity)
                }
                .frame(maxHeight: .infinity)
            }
        }
        .widgetURL(URL(string: "supportcockpit://overview"))
    }
}

// Preview
#Preview {
    MediumWidgetView(entry: SimpleEntry(date: .now, data: sampleWidgetData()))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .frame(width: 360, height: 170)
}
