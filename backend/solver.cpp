#pragma GCC optimize("O3")
#pragma GCC optimize("unroll-loops")

#include <iostream>
#include <vector>
#include <string>
#include <map>

using namespace std;

// --- CUBIE LEVEL DEFINITIONS ---
enum Corner { URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB };
enum Edge { UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR };
enum Color { U, R, F, D, L, B };

// Corner to Facelet mapping (U, R, F faces for each corner)
const int cornerFacelet[8][3] = {
    { 8,  9, 20}, { 6, 18, 38}, { 0, 36, 47}, { 2, 45, 11},
    {29, 26, 15}, {27, 44, 24}, {33, 53, 42}, {35, 17, 51}
};

// Edge to Facelet mapping (2 faces for each edge)
const int edgeFacelet[12][2] = {
    { 5, 10}, { 7, 19}, { 3, 37}, { 1, 46},
    {32, 16}, {28, 25}, {30, 43}, {34, 52},
    {23, 12}, {21, 41}, {50, 39}, {48, 14}
};

const Color cornerColor[8][3] = {
    {U, R, F}, {U, F, L}, {U, L, B}, {U, B, R},
    {D, F, R}, {D, L, F}, {D, B, L}, {D, R, B}
};

const Color edgeColor[12][2] = {
    {U, R}, {U, F}, {U, L}, {U, B}, {D, R}, {D, F},
    {D, L}, {D, B}, {F, R}, {F, L}, {B, L}, {B, R}
};

class CubieCube {
public:
    int cp[8]; 
    int co[8]; 
    int ep[12]; 
    int eo[12]; 

    CubieCube() {
        for (int i = 0; i < 8; i++) { cp[i] = i; co[i] = 0; }
        for (int i = 0; i < 12; i++) { ep[i] = i; eo[i] = 0; }
    }
};

// --- SOLVER ENGINE ---
class RubiksCube {
public:
    string state; 
    CubieCube cubie;

    RubiksCube(string initialState) {
        state = initialState;
        parseToCubie();
    }

    Color charToColor(char c) {
        if (c == 'U') return U;
        if (c == 'R') return R;
        if (c == 'F') return F;
        if (c == 'D') return D;
        if (c == 'L') return L;
        return B;
    }

    void parseToCubie() {
        // Translate 54-char string into corner permutations and orientations
        for (int i = 0; i < 8; i++) {
            for (int ori = 0; ori < 3; ori++) {
                if (state[cornerFacelet[i][ori]] == 'U' || state[cornerFacelet[i][ori]] == 'D') {
                    cubie.co[i] = ori;
                    Color col1 = charToColor(state[cornerFacelet[i][(ori + 1) % 3]]);
                    Color col2 = charToColor(state[cornerFacelet[i][(ori + 2) % 3]]);
                    for (int j = 0; j < 8; j++) {
                        if (col1 == cornerColor[j][1] && col2 == cornerColor[j][2]) {
                            cubie.cp[i] = j;
                            break;
                        }
                    }
                    break;
                }
            }
        }
        
        // Translate 54-char string into edge permutations and orientations
        for (int i = 0; i < 12; i++) {
            for (int j = 0; j < 12; j++) {
                if (charToColor(state[edgeFacelet[i][0]]) == edgeColor[j][0] && 
                    charToColor(state[edgeFacelet[i][1]]) == edgeColor[j][1]) {
                    cubie.ep[i] = j; cubie.eo[i] = 0; break;
                }
                if (charToColor(state[edgeFacelet[i][0]]) == edgeColor[j][1] && 
                    charToColor(state[edgeFacelet[i][1]]) == edgeColor[j][0]) {
                    cubie.ep[i] = j; cubie.eo[i] = 1; break;
                }
            }
        }
    }

    void rotateFace(int offset) {
        char temp[9];
        for (int i = 0; i < 9; i++) temp[i] = state[offset + i];
        state[offset + 0] = temp[6]; state[offset + 1] = temp[3]; state[offset + 2] = temp[0];
        state[offset + 3] = temp[7]; state[offset + 4] = temp[4]; state[offset + 5] = temp[1];
        state[offset + 6] = temp[8]; state[offset + 7] = temp[5]; state[offset + 8] = temp[2];
    }

    void turnU() {
        rotateFace(0);
        for (int i = 0; i < 3; i++) {
            char temp = state[45 + i];
            state[45 + i] = state[36 + i];
            state[36 + i] = state[18 + i];
            state[18 + i] = state[9 + i];
            state[9 + i] = temp;
        }
    }

    void turnD() {
        rotateFace(27);
        for (int i = 0; i < 3; i++) {
            char temp = state[24 + i]; 
            state[24 + i] = state[42 + i]; 
            state[42 + i] = state[51 + i]; 
            state[51 + i] = state[15 + i]; 
            state[15 + i] = temp; 
        }
    }

    void turnR() {
        rotateFace(9);
        char t1 = state[8], t2 = state[5], t3 = state[2];
        state[8] = state[26]; state[5] = state[23]; state[2] = state[20];
        state[26] = state[35]; state[23] = state[32]; state[20] = state[29];
        state[35] = state[45]; state[32] = state[48]; state[29] = state[51];
        state[45] = t1; state[48] = t2; state[51] = t3;
    }

    void turnL() {
        rotateFace(36);
        char t1 = state[0], t2 = state[3], t3 = state[6];
        state[0] = state[53]; state[3] = state[50]; state[6] = state[47];
        state[53] = state[33]; state[50] = state[30]; state[47] = state[27];
        state[33] = state[24]; state[30] = state[21]; state[27] = state[18];
        state[24] = t1; state[21] = t2; state[18] = t3;
    }

    void turnF() {
        rotateFace(18);
        char t1 = state[6], t2 = state[7], t3 = state[8];
        state[6] = state[44]; state[7] = state[41]; state[8] = state[38];
        state[44] = state[29]; state[41] = state[28]; state[38] = state[27];
        state[29] = state[9]; state[28] = state[12]; state[27] = state[15];
        state[9] = t1; state[12] = t2; state[15] = t3;
    }

    void turnB() {
        rotateFace(45);
        char t1 = state[2], t2 = state[1], t3 = state[0];
        state[2] = state[11]; state[1] = state[14]; state[0] = state[17];
        state[11] = state[35]; state[14] = state[34]; state[17] = state[33];
        state[35] = state[42]; state[34] = state[39]; state[33] = state[36];
        state[42] = t1; state[39] = t2; state[36] = t3;
    }

    bool isSolved() {
        return state == "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    }

    int getHeuristic() {
        // Dynamically recalculate Cubie coordinates
        parseToCubie();
        int cornerMisplaced = 0, edgeMisplaced = 0;
        
        for (int i = 0; i < 8; i++) {
            if (cubie.cp[i] != i || cubie.co[i] != 0) cornerMisplaced++;
        }
        for (int i = 0; i < 12; i++) {
            if (cubie.ep[i] != i || cubie.eo[i] != 0) edgeMisplaced++;
        }
        return max(cornerMisplaced / 4, edgeMisplaced / 4);
    }

    void applyMove(int moveStr) {
        int face = moveStr / 3;
        int times = (moveStr % 3) + 1;
        for (int i = 0; i < times; i++) {
            if (face == 0) turnU();
            else if (face == 1) turnD();
            else if (face == 2) turnR();
            else if (face == 3) turnL();
            else if (face == 4) turnF();
            else if (face == 5) turnB();
        }
    }

    bool dfs(int g, int bound, int lastFace, vector<string>& path) {
        int f = g + getHeuristic();
        if (f > bound) return false;
        if (isSolved()) return true;

        string moveNames[] = {"U", "U2", "U'", "D", "D2", "D'", "R", "R2", "R'", "L", "L2", "L'", "F", "F2", "F'", "B", "B2", "B'"};

        for (int i = 0; i < 18; i++) {
            int currentFace = i / 3;
            
            if (currentFace == lastFace) continue;
            if (currentFace == 3 && lastFace == 2) continue; 
            if (currentFace == 1 && lastFace == 0) continue; 
            if (currentFace == 5 && lastFace == 4) continue; 

            applyMove(i);
            path.push_back(moveNames[i]);

            if (dfs(g + 1, bound, currentFace, path)) return true;

            path.pop_back();
            int inverseMoves[] = {2, 1, 0}; 
            int inv = (currentFace * 3) + inverseMoves[i % 3];
            applyMove(inv);
        }
        return false;
    }

    string solveIDAStar() {
        if (isSolved()) return "SOLVED";

        vector<string> path;
        int bound = getHeuristic();
        
        while (bound <= 12) { 
            if (dfs(0, bound, -1, path)) {
                string result = "";
                for (size_t i = 0; i < path.size(); i++) {
                    result += path[i] + (i == path.size() - 1 ? "" : " ");
                }
                return result;
            }
            bound++;
        }
        return "SOLUTION_TOO_DEEP_FOR_MEMORYLESS_HEURISTIC";
    }
};

int main(int argc, char* argv[]) {
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    if (argc < 2) return 1;

    string inputState = argv[1]; 
    if (inputState.length() != 54) {
        cout << "Error: Invalid state length." << "\n";
        return 1;
    }

    RubiksCube cube(inputState);
    string solution = cube.solveIDAStar();
    
    cout << solution << "\n";
    return 0;
}