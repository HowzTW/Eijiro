import SwiftUI

struct SidebarView: View {
    @State private var selection: String? = "Dashboard"
    
    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                
                // 表頭 Logo 與應用名稱
                VStack(spacing: 12) {
                    Image("icon", bundle: .module)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 3)
                        .padding(.horizontal, 4)
                        .padding(.top, 24)
                    
                    Text("抓劇小幫手")
                        .font(.title) // 更大的字體
                        .fontWeight(.heavy)
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 24)
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
                
                NavigationLink(value: "Dashboard") {
                    Label("管理劇集", systemImage: "square.grid.2x2")
                }
                
                NavigationLink(value: "Scraper") {
                    Label("新增劇集", systemImage: "plus.circle")
                }
            }
            .navigationTitle("抓劇小幫手")
        } detail: {
            switch selection {
            case "Dashboard":
                DashboardView()
            case "Scraper":
                ScrapeView()
            default:
                Text("請選擇左側選單")
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    if let url = URL(string: "https://777tv.ai") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    Label("小鴨影音", systemImage: "safari")
                }
                .help("開啟小鴨影音 777TV")
            }
        }
    }
}
