import SwiftUI

struct SplashView: View {
    @State private var isAnimating = false
    
    var body: some View {
        VStack(spacing: 24) {
            // Logo
            Image("icon-app", bundle: .module)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 160, height: 160)
                .scaleEffect(isAnimating ? 1.0 : 0.8)
                .opacity(isAnimating ? 1.0 : 0.0)
            
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
        .opacity(isAnimating ? 1.0 : 0.0) // 使用 isAnimating 統一控制
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.7)) {
                isAnimating = true
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
