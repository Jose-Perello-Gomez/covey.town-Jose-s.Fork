import exp from 'constants';
import { mainModule } from 'process';
import { publicDecrypt } from 'crypto';
import { createPlayerForTesting } from '../../TestUtils';
import Player from '../../lib/Player';
import { GameMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import InvalidParametersError, {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_MOVE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
  });

  describe('_constructor', () => {
    it('should initialize with default state', () => {
      const gameForConstructor = new QuantumTicTacToeGame();

      expect(gameForConstructor.state.status).toBe('WAITING_TO_START');
      expect(gameForConstructor.state.xScore).toBe(0);
      expect(gameForConstructor.state.oScore).toBe(0);
      expect(gameForConstructor.state.moves).toEqual([]);

      (['A', 'B', 'C'] as const).forEach(boardKey => {
        expect(gameForConstructor.state.publiclyVisible[boardKey]).toEqual([
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ]);
      });
    });
  });

  describe('_join', () => {
    it('should add the first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
    });

    it('Should see player in game already', () => {
      game.join(player1);
      game.join(player2);
      expect(() => game.join(player1)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });

    it('Hanlde game changes', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
      game.leave(player1);
      expect(game.state.x).toBeUndefined();
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(game.state.winner).toBeUndefined();
    });

    it('Should wait for second player', () => {
      game.join(player1);
      expect(game.state.status).toBe('WAITING_TO_START');
      game.join(player2);
      expect(game.state.status).toBe('IN_PROGRESS');
    });
    it('Frst player never joins', () => {
      const game2 = new QuantumTicTacToeGame();
      game2.join(player2);
      game2.leave(player2);
      expect(game2.state.status).toBe('WAITING_TO_START');
      expect(game2.state.x).toBeUndefined();
    });

    it('Should start game, set IN_PROGRESS', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      game.join(player2);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
    });

    it('Should now allow a third player', () => {
      const player3 = createPlayerForTesting();
      game.join(player1);
      game.join(player2);
      expect(() => game.join(player3)).toThrowError(GAME_FULL_MESSAGE);
    });
  });

  describe('_leave', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    describe('when two players are in the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });
      it('should set the game to OVER and declare the other player the winner', () => {
        game.leave(player1);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
      });
      it('should make player 1 winner', () => {
        game.leave(player2);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
      });
    });
  });

  describe('applyMove', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('Should end early when one player is guaranteed to win', () => {
      // In a game there is a collision.
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'A', 0, 0);
      expect(game.state.publiclyVisible.A[0][0]).toBe(true); // Did it correctly set up the cell to true?

      // We make Player 1 win the board A.
      makeMove(player1, 'A', 0, 1);
      makeMove(player2, 'B', 0, 0);
      makeMove(player1, 'A', 0, 2);

      // Are the points awarded correctly?
      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(0);

      // We make player 2 win the B board. and we check
      makeMove(player2, 'B', 0, 1);
      makeMove(player1, 'C', 1, 1);
      makeMove(player2, 'B', 0, 2);

      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(1);

      // Player 1 shuld win the last.
      makeMove(player1, 'C', 0, 0);
      makeMove(player2, 'C', 0, 1);
      makeMove(player1, 'C', 2, 2);

      expect(game.state.oScore).toBe(1);
      expect(game.state.xScore).toBe(2);
      expect(game.state.winner).toBe(player1.id);
      expect(game.state.status).toBe('OVER');
    });

    it('Multiple collisions', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'A', 0, 0);
      expect(game.state.publiclyVisible.A[0][0]).toBe(true);

      expect(game.state.moves.length).toBe(2);

      expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
    });

    it('Should not allow out of turn move', () => {
      expect(() => makeMove(player2, 'A', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
    });
    it('move when game is over', () => {
      makeMove(player1, 'A', 0, 0);
      game.state.status = 'OVER';
      expect(() => makeMove(player2, 'A', 0, 1)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
    });

    it('Should not allow double move', () => {
      makeMove(player1, 'A', 0, 0);
      expect(() => makeMove(player1, 'A', 0, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should make a swaure publicly visible on collision', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'A', 0, 0);

      expect(game.state.publiclyVisible.A[0][0]).toBe(true);

      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');

      expect(game.state.moves.length).toBe(2);
    });

    it('Should end in a tie when both players score equally', () => {
      // We make player 1 win the A board.
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'A', 1, 0);
      makeMove(player1, 'A', 0, 1);
      makeMove(player2, 'A', 1, 1);
      makeMove(player1, 'A', 0, 2);

      // Check to see if the points are being awarded correctly.

      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(0);

      // Now player 2 wins B
      makeMove(player2, 'B', 0, 0);
      makeMove(player1, 'B', 0, 1);
      makeMove(player2, 'B', 1, 1);
      makeMove(player1, 'B', 0, 2);
      makeMove(player2, 'B', 2, 2);

      // Is this a tie for now?

      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(1);

      // Make moves until no more moves can be made
      makeMove(player1, 'C', 0, 0);
      makeMove(player2, 'C', 0, 1);
      makeMove(player1, 'C', 0, 2);
      makeMove(player2, 'C', 1, 1);
      makeMove(player1, 'C', 1, 0);
      makeMove(player2, 'C', 1, 2);
      makeMove(player1, 'C', 2, 1);
      makeMove(player2, 'C', 2, 0);
      makeMove(player1, 'C', 2, 2);

      // see the results. It should have ended undefined.
      expect(game.state.status).toBe('OVER');
      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(1);
      expect(game.state.winner).toBe(undefined); // tie
    });

    it('should throw an error if you try to place on your own piece', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'A', 1, 0);

      expect(() => makeMove(player1, 'A', 0, 0)).toThrow(InvalidParametersError);

      expect(game.state.moves.length).toBe(2);

      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      // @ts-expect-error - private property
      expect(game._games.A._board[1][0]).toBe('O');
    });

    it('Should handle collision and second player loses turn', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'A', 0, 0);

      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');

      expect(game.state.moves.length).toBe(2);

      expect(game.state.publiclyVisible.A[0][0]).toBe(true);
    });

    it('should place a piece on an empty square', () => {
      makeMove(player1, 'A', 0, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      expect(game.state.moves.length).toBe(1);
    });

    describe('scoring and game end', () => {
      it('should award a point when a player gets three-in-a-row', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
      });
    });
  });

  describe('_validateMove', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('Makes a move', () => {
      makeMove(player1, 'A', 0, 0);

      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
    });

    it('Should make you lose turn if you play in already won board', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'B', 0, 0);
      makeMove(player1, 'A', 0, 1);
      makeMove(player2, 'C', 0, 0);
      makeMove(player1, 'A', 0, 2);

      expect(game.state.xScore).toBe(1);

      expect(() => makeMove(player2, 'A', 2, 2)).toThrowError(INVALID_MOVE_MESSAGE);
    });

    it('Should not let you play in won board', () => {
      // @ts-expect-error - private property
      game._games.A.state.status = 'OVER';

      expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
    });
    it('Should allow move after invalid move', () => {
      makeMove(player1, 'A', 0, 0);
      expect(() => makeMove(player1, 'A', 1, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      makeMove(player2, 'A', 1, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[1][0]).toBe('O');
    });

    it('Should throw error if player 1 tries to put piece in the same spot', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'B', 0, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      // @ts-expect-error - private property
      expect(game._games.B._board[0][0]).toBe('O');

      expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
    });
    // already checked for the out of turn.
  });

  describe('_checkForWin', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('Should award point in column win', () => {
      makeMove(player1, 'A', 0, 1);
      makeMove(player2, 'C', 0, 0);
      makeMove(player1, 'A', 1, 1);
      makeMove(player2, 'B', 1, 1);
      makeMove(player1, 'A', 2, 1);

      expect(game.state.xScore).toBe(1);
    });

    it('Multiple wins', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'B', 0, 0);
      makeMove(player1, 'A', 0, 1);
      makeMove(player2, 'B', 0, 1);
      makeMove(player1, 'A', 0, 2);
      makeMove(player2, 'C', 1, 0);
      makeMove(player1, 'C', 0, 0);
      makeMove(player2, 'B', 1, 1);
      makeMove(player1, 'C', 0, 1);
      makeMove(player2, 'B', 2, 0);
      makeMove(player1, 'C', 0, 2);
      expect(game.state.xScore).toBe(2);
    });

    it('Should award point in revers diagonal', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'C', 0, 2);
      makeMove(player1, 'B', 1, 0);
      makeMove(player2, 'C', 1, 1);
      makeMove(player1, 'A', 2, 2);
      makeMove(player2, 'C', 2, 0);

      expect(game.state.oScore).toBe(1);
    });

    it('Should award point in regular diagonal', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'C', 0, 0);
      makeMove(player1, 'A', 1, 1);
      makeMove(player2, 'B', 0, 0);
      makeMove(player1, 'A', 2, 2);

      expect(game.state.xScore).toBe(1);
    });
  });

  describe('_checkForGameEnding', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });
    it('Should end game when no more boards are free', () => {
      // @ts-expect-error - accessing private property
      game._games.A.state.status = 'OVER';
      // @ts-expect-error - accessing private property
      game._games.B.state.status = 'OVER';
      // @ts-expect-error - accessing private property
      game._games.C.state.status = 'OVER';

      // @ts-expect-error - accessing private property
      game._checkForGameEnding();

      expect(game.state.status).toBe('OVER');
    });

    it('should end game if player 1 leaves', () => {
      makeMove(player1, 'A', 0, 0);
      game.leave(player1);
      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player2.id);
    });

    it('Should not end game when at least one board is free', () => {
      // @ts-expect-error - accessing private property
      game._games.A.state.status = 'OVER';
      // @ts-expect-error - accessing private property
      game._games.B.state.status = 'OVER';
      // @ts-expect-error - accessing private property
      game._games.C.state.status = 'IN_PROGRESS';

      // @ts-expect-error - accessing private property
      game._checkForGameEnding();

      expect(game.state.status).toBe('IN_PROGRESS');
    });

    it('Should end in tie when no points in all board and is full', () => {
      // @ts-expect-error - accessing private property
      game._games.A.state.status = 'OVER';
      // @ts-expect-error - accessing private property
      game._games.B.state.status = 'OVER';
      // @ts-expect-error - accessing private property
      game._games.C.state.status = 'OVER';

      // @ts-expect-error - accessing private property
      game._xScore = 0;
      // @ts-expect-error - accessing private property
      game._oScore = 0;

      // @ts-expect-error - accessing private property
      game._checkForGameEnding();

      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBeUndefined();
    });
  });
});
