import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Invalid server response"
        case .server(let message): return message
        }
    }
}

actor APIClient {
    static let shared = APIClient()
    static let baseURL = URL(string: "https://nanamicat.com")!

    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func registerPlayer(nickname: String, playerId: String?) async throws -> Player {
        struct Body: Encodable {
            let nickname: String
            let playerId: String?
        }
        struct Response: Decodable {
            let player: Player
        }
        let response: Response = try await post("/api/player", body: Body(nickname: nickname, playerId: playerId))
        return response.player
    }

    func submitScore(playerId: String, nickname: String, mode: PuzzleMode, puzzleId: String) async throws {
        struct Body: Encodable {
            let playerId: String
            let nickname: String
            let mode: String
            let puzzleId: String
        }
        struct Response: Decodable {
            let points: Int?
            let duplicate: Bool?
        }
        _ = try await post("/api/score", body: Body(
            playerId: playerId,
            nickname: nickname,
            mode: mode.rawValue,
            puzzleId: puzzleId
        )) as Response
    }

    func fetchLeaderboard() async throws -> [LeaderboardEntry] {
        struct Response: Decodable {
            let leaderboard: [LeaderboardEntry]
        }
        let response: Response = try await get("/api/leaderboard")
        return response.leaderboard
    }

    func submitPuzzle(_ payload: PuzzleSubmissionPayload) async throws -> PuzzleSubmissionResponse {
        try await post("/api/puzzles", body: payload)
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        let url = Self.baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request)
        return try decode(data: data, response: response)
    }

    private func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let url = Self.baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await session.data(for: request)
        return try decode(data: data, response: response)
    }

    private func decode<T: Decodable>(data: Data, response: URLResponse) throws -> T {
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        if (200..<300).contains(http.statusCode) {
            return try JSONDecoder().decode(T.self, from: data)
        }
        if let payload = try? JSONDecoder().decode([String: String].self, from: data),
           let message = payload["error"] {
            throw APIError.server(message)
        }
        throw APIError.server("Request failed: \(http.statusCode)")
    }
}
