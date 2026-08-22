import SwiftUI

struct SidebarView: View {
    @State private var selection: String? = "Dashboard"
    
    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                
                // 表頭 Logo 與應用名稱
                VStack(spacing: 12) {
                    Image("icon-app", bundle: .module)
                        .resizable()
                        .scaledToFit()
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

                NavigationLink(value: "Deleted") {
                    Label("已刪除劇集", systemImage: "clock.arrow.circlepath")
                }
            }
            .navigationTitle("抓劇小幫手")
        } detail: {
            switch selection {
            case "Dashboard":
                DashboardView()
            case "Scraper":
                ScrapeView()
            case "Deleted":
                DeletedDramasView()
            default:
                Text("請選擇左側選單")
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    if let url = URL(string: "https://gimyai.tw") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    Label("Gimy+", systemImage: "safari")
                        .labelStyle(.titleAndIcon)
                }
                .help("開啟 Gimy+ 劇迷")
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    if let url = URL(string: "https://777tv.ai") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    Label("777TV", systemImage: "safari")
                        .labelStyle(.titleAndIcon)
                }
                .help("開啟小鴨影音 777TV")
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    if let url = URL(string: "https://howztw.github.io/Eijiro/watchDrama/index.html") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    Label("追劇小幫手", systemImage: "safari")
                        .labelStyle(.titleAndIcon)
                }
                .help("開啟追劇小幫手")
            }
        }
    }
}
