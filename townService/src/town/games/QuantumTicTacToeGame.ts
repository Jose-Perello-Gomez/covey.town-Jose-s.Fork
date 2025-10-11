import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';
import InvalidParametersError, {
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_COMMAND_MESSAGE,
  INVALID_MOVE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

const makeBoard = () => Array.from({ length: 3 }, () => Array(3).fill(false)); // FIlls the boards with FALSE.

/**
 * A QuantumTicTacToeGame is a Game that implements the rules of the Tic-Tac-Toe variant described at https://www.smbc-comics.com/comic/tic.
 * This class acts as a controller for three underlying TicTacToeGame instances, orchestrating the "quantum" rules by taking
 * the role of the monitor.
 */
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _xScore: number;

  private _oScore: number;

  private _moveCount: number;

  // Constructor to set up the gme to defaul.

  public constructor() {
    super({
      moves: [], // no moves, status is in waiting, scores are in 0 and the boards are invisible.
      status: 'WAITING_TO_START',
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
        A: makeBoard(),
        B: makeBoard(),
        C: makeBoard(),
      },
    });

    // three different games.
    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };

    this._xScore = 0;
    this._oScore = 0;
    this._moveCount = 0;
  }

  /**
   * Allows player to join the game.
   * This also updated the game for the new player.
   * If Two players are already inside the game then it will update status to 'IN_PROGRESS'
   * @param player
   */
  protected _join(player: Player): void {
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (!this.state.x) {
      this.state = {
        ...this.state,
        x: player.id,
      };

      Object.values(this._games).forEach(game => {
        game.join(player);
      });
    } else if (!this.state.o) {
      this.state = {
        ...this.state,
        o: player.id,
      };

      Object.values(this._games).forEach(game => {
        game.join(player);
      });
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }

    // updates status to IN_PROGRESS
    if (this.state.x && this.state.o) {
      this.state = {
        ...this.state,
        status: 'IN_PROGRESS',
      };
    }
  }

  /**
   * Removes a player from the game.
   * This will also take care of the sub games by making the player leave each one.
   * This will also take care in the case that two players are already in the game, such is the case it will update stastus to OVER.
   * @param player
   * @returns
   */
  protected _leave(player: Player): void {
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    this._games.A.leave(player);
    this._games.B.leave(player);
    this._games.C.leave(player);

    if (
      (this.state.x === player.id && !this.state.o) ||
      (this.state.o === player.id && !this.state.x)
    ) {
      this.state = {
        moves: [],
        xScore: 0,
        oScore: 0,
        publiclyVisible: {
          A: makeBoard(),
          B: makeBoard(),
          C: makeBoard(),
        },
        status: 'WAITING_TO_START',
      };
      return;
    }
    if (this.state.x === player.id) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.o,
      };
    } else {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.x,
      };
    }
  }

  /**
   * Checks that the given move is "valid": that the it's the right
   * player's turn, that the game is actually in-progress, etc.
   * @see TicTacToeGame#_validateMove
   */
  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    const oneBoard = this._games[move.move.board]; // Sees which board is the move being performed on.
    if (oneBoard.state.status === 'OVER') {
      // This checks if the board is either full or finished to not allow more moves.
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    // This checks the turns of both players.
    if (move.move.gamePiece === 'X' && this.state.moves.length % 2 === 1) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    } else if (move.move.gamePiece === 'O' && this.state.moves.length % 2 === 0) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    // If there is no game in progress then no moves can be done. So it throws an error.
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }

    // Gets the type of piece. And after that it compares it to the gamepiece that is being used
    // If they are the same then it throws and Error, though no turn is consumed.
    const currentValue = oneBoard.getPieceAt(move.move.row, move.move.col);
    if (
      (move.move.gamePiece === 'X' && currentValue === 'X') ||
      (move.move.gamePiece === 'O' && currentValue === 'O')
    ) {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    // See which piecve is being placed.
    if (move.playerID === this.state.x) {
      move.move.gamePiece = 'X';
    } else {
      move.move.gamePiece = 'O';
    }

    // Calls the function to validate it.
    this._validateMove(move);

    // Variable to keep track of the spots
    let spotHasBeenTaken = false;

    // This looks through all of the previous moves to check for the spot if it's already taken.
    // If the case appears that it has already been taking then it turns it into true.
    // In this case th eplayer does loose their turn.
    for (const m of this.state.moves) {
      if (m.board === move.move.board && m.row === move.move.row && m.col === move.move.col) {
        this.state.publiclyVisible[m.board][m.row][m.col] = true;
        this._moveCount++;
        spotHasBeenTaken = true;
      }
    }

    // Current move is added to the list of moves
    this.state = {
      ...this.state,
      moves: [...this.state.moves, move.move],
    };

    // spot is empty then the movement is applied.
    if (!spotHasBeenTaken) {
      this._games[move.move.board]._applyMove(move.move);
    }

    // Now we call borth functions for points and game ends
    this._checkForWins();

    this._checkForGameEnding();
  }
  /**
   * Checks all three sub-games for any new three-in-a-row conditions.
   * Awards points and marks boards as "won" so they can't be played on.
   */

  private _checkForWins(): void {
    let thisGameXScore = 0;
    let thisGameOScore = 0;
    // These two variables will helps keep track of the points

    // We iterate through the boards that are 'OVER' and have a winner. Others will be ignored.
    // Since it has a winner we can see which one it is, and whoever player it is we add +1 to the local variable.
    for (const game of Object.values(this._games)) {
      if (game.state.status === 'OVER' && game.state.winner) {
        if (game.state.winner === this.state.x) {
          thisGameXScore++;
        } else if (game.state.winner === this.state.o) {
          thisGameOScore++;
        }
      }
    }

    // we update the scores
    this._xScore = thisGameXScore;
    this._oScore = thisGameOScore;

    // And we also update the state.

    this.state = {
      ...this.state,
      xScore: thisGameXScore,
      oScore: thisGameOScore,
    };
  }

  /**
   * A Quantum Tic-Tac-Toe game ends when no more moves are possible.
   * This happens when all squares on all boards are either occupied or part of a won board.
   */
  private _checkForGameEnding(): void {
    // We see who of the two has greater score. Whoever it is then we set the status as the winner.
    // However, if there is a tie in the game then the winner is UNDEFINED
    if (this._xScore > this._oScore) {
      this.state = { ...this.state, winner: this.state.x };
    } else if (this._oScore > this._xScore) {
      this.state = { ...this.state, winner: this.state.o };
    } else {
      this.state = { ...this.state, winner: undefined };
    }

    // Check for all of the boards and see if they have all finished.
    const allBoardsDone = (['A', 'B', 'C'] as const).every(boardKey => {
      const game = this._games[boardKey];
      return game.state.status === 'OVER';
    });

    // After we look for them if the statement is true then we can set the entire game as OVER
    if (allBoardsDone) {
      this.state = { ...this.state, status: 'OVER' };
    }
  }
}
