import Foundation

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var dramas: [Drama] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func loadDramas() async {
        isLoading = true
        errorMessage = nil
        do {
            var fetched = try await GASNetworkManager.shared.fetchDramas()
            fetched.sort { $0.update_time > $1.update_time }
            self.dramas = fetched
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    func deleteDrama(drama: Drama) async {
        do {
            _ = try await GASNetworkManager.shared.deleteDrama(id: drama.id)
            dramas.removeAll { $0.id == drama.id }
        } catch {
            self.errorMessage = "刪除失敗：\(error.localizedDescription)"
        }
    }
}
