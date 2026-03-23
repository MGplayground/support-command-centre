import SwiftUI

// MARK: - Medium Widget View (Stats Overview)

struct MediumWidgetView: View {
    let entry: Provider.Entry
    
    var body: some View {
        ZStack {
            // Glass background
            Color.clear
                .background(.ultraThinMaterial)
            
            HStack(spacing: 14) {
                // Left: Bonus Section
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 4) {
                        Text("BONUS")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white.opacity(0.6))
                            .tracking(1)
                        
                        if entry.data.bonus.isOnFire {
                            Image(systemName: "flame.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color.orange, Color.red],
                                        startPoint:.leading,
                                        endPoint: .trailing
                                    )
                                )
                        }
                        
                        Spacer()
                    }
                    
                    Text("$\\(entry.data.bonus.amount, specifier: "%.2f")")
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.22, green: 0.74, blue: 0.97),
                                    Color(red: 0.49, green: 0.77, blue: 0.99)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.green.opacity(0.8))
                        
                        Text("\\(entry.data.bonus.ticketsClosed) tickets")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white.opacity(0.75))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                // Divider
                Rectangle()
                    .fill(Color.white.opacity(0.15))
                    .frame(width: 1)
                
                // Right: Stats Section
                VStack(spacing: 10) {
                    StatRow(
                        icon: "message.fill",
                        label: "CHATS",
                        value: "\\(entry.data.stats.intercom.totalChats)",
                        color: .cyan
                    )
                    
                    StatRow(
                        icon: "exclamationmark.triangle.fill",
                        label: "JIRA",
                        value: "\\(entry.data.stats.jira.totalOpen)",
                        color: .orange
                    )
                    
                    StatRow(
                        icon: "star.fill",
                        label: "CSAT",
                        value: String(format: "%.1f", entry.data.stats.intercom.csatScore),
                        color: .yellow
                    )
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(14)
        }
    }
}

// MARK: - Stat Row Component

struct StatRow: View {
    let icon: String
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: icon)
                .font(.system(size: 11))
                .foregroundColor(color.opacity(0.7))
                .frame(width: 18, alignment: .center)
            
            Text(label)
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(.white.opacity(0.5))
                .tracking(0.5)
                .frame(width: 42, alignment: .leading)
            
            Spacer()
            
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundColor(.white)
        }
    }
}

// Preview
#Preview {
    MediumWidgetView(entry: SimpleEntry(date: .now, data: sampleWidgetData()))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .frame(width: 360, height: 170)
}
