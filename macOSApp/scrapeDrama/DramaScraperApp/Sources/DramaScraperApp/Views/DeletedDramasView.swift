import SwiftUI

struct DeletedDramasView: View {
    @StateObject private var viewModel = DeletedDramasViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // 搜尋欄
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("以片名搜尋...", text: $viewModel.searchText)
                    .textFieldStyle(.plain)
                if !viewModel.searchText.isEmpty {
                    Button {
                        viewModel.searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(10)
            .background(Color(NSColor.controlBackgroundColor))
            .cornerRadius(8)
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)

            Divider()

            // 內容區
            if viewModel.isLoading {
                Spacer()
                ProgressView("載入中...")
                Spacer()
            } else if let error = viewModel.errorMessage {
                Spacer()
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
                Spacer()
            } else if viewModel.filteredDramas.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 50))
                        .foregroundColor(.secondary)
                        .opacity(0.5)
                    Text(viewModel.searchText.isEmpty ? "尚無已刪除劇集記錄" : "找不到符合「\(viewModel.searchText)」的結果")
                        .font(.title3)
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else {
                List(viewModel.filteredDramas) { drama in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(drama.name)
                                .font(.body)
                                .fontWeight(.semibold)
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
                        Spacer()
                        Text(drama.deletedAtFormatted)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .monospacedDigit()
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.inset)
            }
        }
        .navigationTitle("已刪除劇集")
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
