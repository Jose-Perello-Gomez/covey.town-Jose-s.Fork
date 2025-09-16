import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';
import InvalidParametersError, {
  PLAYER_ALREADY_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

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

  public constructor() {
    super({
      moves: [],
      status: 'WAITING_TO_START',
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
        A: [],
        B: [],
        C: [],
      },
    });

    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };

    this._xScore = 0;
    this._oScore = 0;
    this._moveCount = 0;
    // TODO: implement me
  }

  protected _join(player: Player): void {
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (!this.state.x) {
      this.state = {
        ...this.state,
        x: player.id,
      };
    }
    // TODO: implement me
  }

  protected _leave(player: Player): void {
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }

    if (this.state.o === undefined) {
      this.state = {
        moves: [],
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
    // TODO: implement me
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    let gamePiece: 'X' | 'O';
    if (move.playerID === this.state.x) {
      gamePiece = 'X';
    } else {
      gamePiece = 'O';
    }
    const move = {
      gamePiece,
      col: move.move.col,
      row: move.move.row,
      board: move.move.board,
    };

    this._validateMove(move);

    // TODO: implement the guts of this method

    this._checkForWins();
    this._checkForGameEnding();
  }

  /**
   * Checks all three sub-games for any new three-in-a-row conditions.
   * Awards points and marks boards as "won" so they can't be played on.
   */
  private _checkForWins(): void {
    // TODO: implement me
  }

  /**
   * A Quantum Tic-Tac-Toe game ends when no more moves are possible.
   * This happens when all squares on all boards are either occupied or part of a won board.
   */
  private _checkForGameEnding(): void {
    // TODO: implement me
  }
}
