import { assert } from 'console';
// import { throws } from 'assert';
import InvalidParametersError, {
  GAME_ID_MISSMATCH_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_COMMAND_MESSAGE,
  INVALID_MOVE_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  GameInstance,
  InteractableCommand,
  InteractableCommandReturnType,
  InteractableType,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
  TicTacToeMove,
} from '../../types/CoveyTownSocket';
import GameArea from './GameArea';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
// import TicTacToeGame from './TicTacToeGame';

/**
 * A QuantumTicTacToeGameArea is a GameArea that hosts a QuantumTicTacToeGame.
 * @see QuantumTicTacToeGame
 * @see GameArea
 */
export default class QuantumTicTacToeGameArea extends GameArea<QuantumTicTacToeGame> {
  protected getType(): InteractableType {
    return 'QuantumTicTacToeArea';
  }

  private _stateUpdated(updatedState: GameInstance<QuantumTicTacToeGameState>) {
    if (updatedState.state.status === 'OVER') {
      // If we haven't yet recorded the outcome, do so now.
      const gameID = this._game?.id;
      if (gameID && !this._history.find(eachResult => eachResult.gameID === gameID)) {
        const { x, o, xScore, oScore } = updatedState.state;
        if (x && o) {
          const xName = this._occupants.find(eachPlayer => eachPlayer.id === x)?.userName || x;
          const oName = this._occupants.find(eachPlayer => eachPlayer.id === o)?.userName || o;
          this._history.push({
            gameID,
            scores: {
              [xName]: xScore,
              [oName]: oScore,
            },
          });
        }
      }
    }
    this._emitAreaChanged();
  }

  /**
   * Handle a command from a player in this game area.
   * Supported commands:
   * - JoinGame (joins the game `this._game`, or creates a new one if none is in progress)
   * - GameMove (applies a move to the game)
   * - LeaveGame (leaves the game)
   *
   * If the command is successful (does not throw an error), calls this._emitAreaChanged (necessary
   * to notify any listeners of a state update)
   * If the command is unsuccessful (throws an error), the error is propagated to the caller
   */
  public handleCommand<CommandType extends InteractableCommand>( // This code is taken from the TicTacToeGameArea
    command: CommandType,
    player: Player,
  ): InteractableCommandReturnType<CommandType> {
    if (command.type === 'GameMove') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this._game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      assert(
        command.move.gamePiece === 'X' || command.move.gamePiece === 'O',
        'Invalid game piece',
      );
      if (!('board' in command.move)) {
        throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
      }
      // these two shouldn't really affect anmything as far as I know
      const move = command.move as QuantumTicTacToeMove;
      assert(move.board === 'A' || move.board === 'B' || move.board === 'C', 'Invalid Board');
      game.applyMove({
        gameID: command.gameID,
        playerID: player.id,
        move,
      });
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'JoinGame') {
      let game = this._game;
      if (!game || game.state.status === 'OVER') {
        game = new QuantumTicTacToeGame();
        this._game = game;
      }
      game.join(player);
      this._stateUpdated(game.toModel());
      return { gameID: game.id } as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'LeaveGame') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this._game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      game.leave(player);
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }
}
