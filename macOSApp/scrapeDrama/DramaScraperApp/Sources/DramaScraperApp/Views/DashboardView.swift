import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    
    let columns = [
        GridItem(.adaptive(minimum: 180, maximum: 240), spacing: 24)
    ]
    
    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView("同步資料庫中...")
                    .padding(.top, 100)
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 40))
                        .foregroundColor(.red)
                    Text("載入發生錯誤")
                        .font(.headline)
                    Text(error)
                        .foregroundColor(.secondary)
                    Button("重試") {
                        Task { await viewModel.loadDramas() }
                    }
                }
                .padding(.top, 100)
            } else if viewModel.dramas.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "film")
                        .font(.system(size: 60))
                        .foregroundColor(.secondary)
                        .opacity(0.5)
                    Text("目前沒有已儲存的劇集")
                        .font(.title3)
                        .foregroundColor(.secondary)
                    Text("請至「新增劇集」開始抓取")
                        .foregroundColor(.secondary)
                }
                .padding(.top, 150)
            } else {
                LazyVGrid(columns: columns, spacing: 24) {
                    ForEach(viewModel.dramas) { drama in
                        DramaCardView(drama: drama, onDelete: {
                            Task { await viewModel.deleteDrama(drama: drama) }
                        })
                    }
                }
                .padding(24)
            }
        }
        .navigationTitle("管理劇集")
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button(action: { Task { await viewModel.loadDramas() } }) {
                    Label("重新整理", systemImage: "arrow.clockwise")
                }
            }
        }
        .task {
            if viewModel.dramas.isEmpty {
                await viewModel.loadDramas()
            }
        }
    }
}

struct DramaCardView: View {
    let drama: Drama
    let onDelete: () -> Void
    
    @State private var showDeleteConfirmation = false
    @State private var isHovering = false
    
    var body: some View {
        VStack(spacing: 0) {
            // 封面圖
            Color.black
                .aspectRatio(2/3, contentMode: .fit)
                .overlay(
                    AsyncImage(url: URL(string: drama.cover_image)) { phase in
                        switch phase {
                        case .empty:
                            ProgressView()
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure:
                            Image(systemName: "photo")
                                .foregroundColor(.gray)
                        @unknown default:
                            EmptyView()
                        }
                    }
                )
                .clipped()
            
            // 資訊與操作
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top) {
                    Text(drama.name)
                        .font(.title3)
                        .fontWeight(.bold)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Spacer()

                    Button(role: .destructive) {
                        showDeleteConfirmation = true
                    } label: {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                    .padding(6)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(6)
                }

                HStack(spacing: 6) {
                    Text(drama.source)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(drama.source == "Gimy+" ? Color.purple : Color.blue)
                        .cornerRadius(4)

                    Text("ID: \(drama.numericId)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(12)
            .background(Color(NSColor.controlBackgroundColor))
        }
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isHovering ? Color.accentColor : Color.gray.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(isHovering ? 0.2 : 0.1), radius: 5, y: 2)
        .scaleEffect(isHovering ? 1.02 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isHovering)
        .onHover { hovering in
            isHovering = hovering
        }
        .confirmationDialog(
            "確定要從資料庫中移除「\(drama.name)」嗎？",
            isPresented: $showDeleteConfirmation
        ) {
            Button("刪除", role: .destructive, action: onDelete)
            Button("取消", role: .cancel) { }
        } message: {
            Text("此動作無法復原。")
        }
    }
}
