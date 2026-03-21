import SwiftUI

struct ScrapeView: View {
    @StateObject private var viewModel = ScrapeViewModel()
    
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            
            // 輸入區塊
            HStack(spacing: 16) {
                TextField("輸入 777TV 劇集 ID (例如: 351808)", text: $viewModel.targetId)
                    .textFieldStyle(.roundedBorder)
                    .font(.title3)
                    .frame(maxWidth: 400)
                    .disabled(viewModel.isRunning)
                
                Button(action: {
                    viewModel.startScraping()
                }) {
                    Text("啟動任務")
                        .fontWeight(.bold)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isRunning || viewModel.targetId.trimmingCharacters(in: .whitespaces).isEmpty)
                
                Spacer()
            }
            
            // 狀態與進度條
            if viewModel.isRunning || viewModel.successData != nil {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(viewModel.statusMessage)
                            .fontWeight(.semibold)
                            .foregroundColor(.accentColor)
                        Spacer()
                        Text("\(Int(viewModel.progressPercent * 100))%")
                            .foregroundColor(.secondary)
                    }
                    
                    ProgressView(value: viewModel.progressPercent, total: 1.0)
                        .progressViewStyle(.linear)
                        .tint(.accentColor)
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 3, y: 1)
            }
            
            // 成功面板
            if let success = viewModel.successData {
                HStack(spacing: 20) {
                    AsyncImage(url: URL(string: success.coverImgUrl ?? "")) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            Color.gray.opacity(0.3)
                        }
                    }
                    .frame(width: 80, height: 120)
                    .cornerRadius(8)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Label("抓取成功並已同步", systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.headline)
                        
                        Text(success.title)
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
                .padding()
                .background(Color.green.opacity(0.1))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.green.opacity(0.3), lineWidth: 1))
            }
            
            // Console Terminal Log 模擬區塊
            VStack(alignment: .leading, spacing: 0) {
                Text("Terminal Log")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(NSColor.windowBackgroundColor))
                
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(viewModel.logs) { log in
                                Text(log.message)
                                    .font(.system(.subheadline, design: .monospaced))
                                    .foregroundColor(Color(red: 0.1, green: 0.8, blue: 0.1)) // 客製綠色
                                    .id(log.id)
                            }
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .background(Color.black)
                    .onChange(of: viewModel.logs.count) { _ in
                        if let lastLog = viewModel.logs.last {
                            withAnimation {
                                proxy.scrollTo(lastLog.id, anchor: .bottom)
                            }
                        }
                    }
                }
            }
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.2), radius: 5, y: 2)
            
        }
        .padding(32)
        .navigationTitle("新增劇集")
    }
}
