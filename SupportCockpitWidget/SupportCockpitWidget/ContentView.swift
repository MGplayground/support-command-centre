//
//  ContentView.swift
//  SupportCockpitWidget
//
//  Created by Mauro on 06/01/2026.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(Color.cyan.opacity(0.2))
                        .frame(width: 80, height: 80)
                        .blur(radius: 10)
                    
                    Image(systemName: "cpu.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(LinearGradient(colors: [.cyan, .blue], startPoint: .topLeading, endPoint: .bottomTrailing))
                }
                
                VStack(spacing: 8) {
                    Text("SUPPORT COCKPIT")
                        .font(.system(size: 14, weight: .black))
                        .tracking(4)
                        .foregroundStyle(.white)
                    
                    Text("AI ASSISTANT ACTIVE")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.cyan.opacity(0.8))
                }
                
                Text("Redirecting to your dashboard...")
                    .font(.system(size: 12))
                    .foregroundStyle(.gray)
                    .padding(.top, 20)
            }
        }
    }
}

#Preview {
    ContentView()
}
