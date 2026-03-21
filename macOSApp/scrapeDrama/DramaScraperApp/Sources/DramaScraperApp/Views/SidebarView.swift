import SwiftUI

struct SidebarView: View {
    @State private var selection: String? = "Dashboard"
    
    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
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
