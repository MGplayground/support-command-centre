import SwiftUI

// MARK: - Small Widget View (Bonus Tracker)

struct SmallWidgetView: View {
    let entry: Provider.Entry
    
    var body: some View {
        ZStack {
            // Glass background effect
            Color.clear
                .background(.ultraThinMaterial)
            
            VStack(spacing: 10) {
                // Icon with fire effect if on fire
                ZStack {
                    if entry.data.bonus.isOnFire {
                        Image(systemName: "flame.fill")
                            .font(.title)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.orange, Color.red],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                    } else {
                        Image(systemName: "chart.bar.fill")
                            .font(.title2)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.22, green: 0.74, blue: 0.97),
                                        Color(red: 0.49, green: 0.77, blue: 0.99)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                }
                
                // Bonus amount
                Text("$\\(entry.data.bonus.amount, specifier: "%.2f")")
                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                
                // Label
                Text("TODAY'S BONUS")
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .foregroundColor(.white.opacity(0.6))
                    .tracking(1.2)
                
                // Tickets count
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 9))
                        .foregroundColor(.green.opacity(0.8))
                    
                    Text("\\(entry.data.bonus.ticketsClosed) tickets")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.75))
                }
            }
            .padding(14)
        }
    }
}

// Preview
#Preview {
    SmallWidgetView(entry: SimpleEntry(date: .now, data: sampleWidgetData()))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .frame(width: 170, height: 170)
}
