import Foundation

@MainActor
class DeletedDramasViewModel: ObservableObject {
    @Published var dramas: [DeletedDrama] = []
    @Published var searchText: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    var filteredDramas: [DeletedDrama] {
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        let filtered = trimmed.isEmpty ? dramas : dramas.filter { $0.name.localizedCaseInsensitiveContains(trimmed) }
        return filtered.sorted { $0.deleted_at > $1.deleted_at }
    }

    func loadDramas() async {
        isLoading = true
        errorMessage = nil
        do {
            dramas = try await GASNetworkManager.shared.fetchDeletedDramas()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
