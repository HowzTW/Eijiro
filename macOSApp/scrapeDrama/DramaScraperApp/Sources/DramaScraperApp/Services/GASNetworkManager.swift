import Foundation

class GASNetworkManager {
    static let shared = GASNetworkManager()
    let gasURLString = "https://script.google.com/macros/s/AKfycbzwHa2fa4e_QdyfD3z01tXepwY9ZyY98UlS_6mjVGOsPZaoHVloSyEc9_kJniuNn2_X/exec"
    
    func fetchDramas() async throws -> [Drama] {
        guard let url = URL(string: gasURLString) else {
            throw URLError(.badURL)
        }
        let (data, _) = try await URLSession.shared.data(from: url)
        
        let decoder = JSONDecoder()
        return try decoder.decode([Drama].self, from: data)
    }
    
    func deleteDrama(id: String) async throws -> String {
        guard let url = URL(string: gasURLString) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["action": "delete", "id": id]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        if let resultString = String(data: data, encoding: .utf8) {
            return resultString
        } else {
            throw URLError(.cannotDecodeRawData)
        }
    }
    
    func syncDrama(drama: Drama) async throws -> String {
        guard let url = URL(string: gasURLString) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            // Encode drama object (sources is now a structured array)
            request.httpBody = try JSONEncoder().encode(drama)
        } catch {
            print("Encoding error: \(error)")
            throw error
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        if let resultString = String(data: data, encoding: .utf8) {
            return resultString
        } else {
            throw URLError(.cannotDecodeRawData)
        }
    }
}
