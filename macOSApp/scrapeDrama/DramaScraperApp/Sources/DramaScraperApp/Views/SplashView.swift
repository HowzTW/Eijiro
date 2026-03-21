import SwiftUI

struct SplashView: View {
    @State private var opacity = 0.0
    @State private var scale = 0.8
    
    var body: some View {
        VStack(spacing: 24) {
            Image("icon", bundle: .module)
                .resizable()
                .scaledToFit()
                .frame(width: 150, height: 150)
                .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                .shadow(color: .black.opacity(0.3), radius: 15, y: 8)
                .scaleEffect(scale)
            
            VStack(spacing: 8) {
                Text("抓劇小幫手")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                Text("Drama Scraper")
                    .font(.title2)
                    .foregroundColor(.secondary)
            }
            
            Text("最後版本時間：\(buildTime)")
                .font(.caption)
                .foregroundColor(.gray)
                .padding(.top, 40)
        }
        .padding(80)
        .opacity(opacity)
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.7)) {
                opacity = 1.0
                scale = 1.0
            }
        }
    }
    
    var buildTime: String {
        if let executableURL = Bundle.main.executableURL,
           let attrs = try? FileManager.default.attributesOfItem(atPath: executableURL.path),
           let date = attrs[.modificationDate] as? Date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
            return formatter.string(from: date)
        }
        return "未知時間"
    }
}
