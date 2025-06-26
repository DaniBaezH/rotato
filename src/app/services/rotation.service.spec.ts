import {RotationService} from './rotation.service';
import * as faker from 'faker';
import {Pair} from '../utillity/pair';
import {arraysAreEqual} from '../utillity/lulz';

describe('RotationService', () => {
  const testDevData = [];
  const testBoardData = [];

  const localStorageService = {
    getCarriers: jest.fn(),
    getDevs: jest.fn(),
    getBoards: jest.fn(),
    getDisabled: jest.fn(),
    getDisabledBoards: jest.fn(),
    getSticking: jest.fn(),
    getAllowSolo: jest.fn(),
    getPairs: jest.fn(),
    getKeepHistory: jest.fn(),
    getHistory: jest.fn(),
    getHistoryDays: jest.fn(),
  };

  const rotationService = new RotationService(localStorageService as any);

  beforeEach(() => {
    localStorageService.getCarriers.mockReturnValue([]);
    localStorageService.getDisabled.mockReturnValue([]);
    localStorageService.getDisabledBoards.mockReturnValue([]);
    localStorageService.getSticking.mockReturnValue([]);
    localStorageService.getAllowSolo.mockReturnValue(false);
    localStorageService.getPairs.mockReturnValue([]);
    localStorageService.getKeepHistory.mockReturnValue(false);
    localStorageService.getHistory.mockReturnValue([]);
    localStorageService.getHistoryDays.mockReturnValue(null);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('makeItRotato', () => {

    describe('when dev history is not enabled', () => {

      it('should return basic list of randomized pairs when history is disabled', () => {
        const devs = getDevs(6);
        const boards = getBoards(3);

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue(boards);

        rotatoValidato((results: Pair[]) => {
          expect(results).toHaveLength(3);
          expect(results).toSatisfyAll(pairHasTwoDevs);
          verifyPairsContainDevsAndBoards(results, devs, boards);
        }, (allResults: Pair[][]) => verifyAllPairsAreUnique(allResults));
      });

      it('should return basic rotation when history is empty', () => {
        const devs = getDevs(4);
        const boards = getBoards(2);

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue(boards);
        localStorageService.getKeepHistory.mockReturnValue(true);
        localStorageService.getHistory.mockReturnValue([]);

        const results = rotationService.makeItANewRotato();

        expect(results).toHaveLength(2);
        expect(results).toSatisfyAll(pairHasTwoDevs);
        verifyPairsContainDevsAndBoards(results, devs, boards);
      });

      it('should not pair carrying devs together when there are carrying devs', () => {
        const carryingDevs = [getNthDev(1), getNthDev(2), getNthDev(3)];
        const cleanDevs = [getNthDev(4), getNthDev(5), getNthDev(6)];

        const devs = [...carryingDevs, ...cleanDevs];

        const boards = getBoards(3);

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue(boards);
        localStorageService.getCarriers.mockReturnValue(carryingDevs);

        rotatoValidato((results: Pair[]) => {
          expect(results).toHaveLength(3);
          expect(results).toSatisfyAll(pairHasTwoDevs);
          verifyPairsContainDevsAndBoards(results, devs, boards);

          const pairHasOneCarryingAndOneClean = (pair: Pair) =>
            (carryingDevs.includes(pair.devs[0]) && cleanDevs.includes(pair.devs[1])) ||
            (carryingDevs.includes(pair.devs[1]) && cleanDevs.includes(pair.devs[0]));

          expect(results).toSatisfyAll(pairHasOneCarryingAndOneClean);
        }, (allResults: Pair[][]) => verifyAllPairsAreUnique(allResults));
      });

      it('should make a solo pair when there are more carriers than clean devs', () => {
        const carryingDevs = [getNthDev(1), getNthDev(2)];

        const devs = getDevs(3);
        const boards = getBoards(2);

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue(boards);
        localStorageService.getCarriers.mockReturnValue(carryingDevs);

        rotatoValidato((results: Pair[]) => {
          verifyPairsContainDevsAndBoards(results, devs, boards);

          const pairSizes = results.map(x => x.devs.length);
          expect(pairSizes).toIncludeSameMembers([2, 1]);

          const oneCarrierIsSolo = (pairs: Pair[]) =>
            (pairs[0].devs.length === 1 && carryingDevs.includes(pairs[0].devs[0])) ||
            (pairs[1].devs.length === 1 && carryingDevs.includes(pairs[0].devs[0]));
          expect(results).toSatisfy(oneCarrierIsSolo);
        }, (allResults: Pair[][]) => verifyAllPairsAreUnique(allResults));
      });

      it('should not use disabled devs', () => {
        const disabledDevs = [getNthDev(1), getNthDev(2)];
        const enabledDevs = [getNthDev(3), getNthDev(4)];

        const devs = [...disabledDevs, ...enabledDevs];

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue([]);
        localStorageService.getDisabled.mockReturnValue(disabledDevs);

        const results = rotationService.makeItANewRotato();

        expect(results).toHaveLength(1);
        expect(results[0].devs).toIncludeSameMembers(enabledDevs);
      });

      it('should not use disabled boards', () => {
        const disabledBoards = [getNthBoard(1), getNthBoard(2)];
        const enabledBoard = getNthBoard(3);

        const devs = getDevs(6);
        const boards = [...disabledBoards, enabledBoard];

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue(boards);
        localStorageService.getDisabledBoards.mockReturnValue(disabledBoards);

        const results = rotationService.makeItANewRotato();

        expect(results).toHaveLength(3);
        expect(results).toSatisfyAll(pairHasTwoDevs);
        verifyPairsContainDevsAndBoards(results, devs, [enabledBoard, undefined, undefined]);
      });

      it('should make pair without board when not enough boards exist', () => {
        const devs = getDevs(4);
        const board = getNthBoard(1);

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue([board]);

        const results = rotationService.makeItANewRotato();

        expect(results).toHaveLength(2);
        expect(results).toSatisfyAll(pairHasTwoDevs);
        verifyPairsContainDevsAndBoards(results, devs, [board, undefined]);
      });

      it('should keep sticking pairs in the rotated pairs', () => {
        const firstStickingPair: Pair = {
          board: getNthBoard(1),
          devs: [getNthDev(1), getNthDev(2)]
        };

        const secondStickingPair: Pair = {
          board: getNthBoard(2),
          devs: [getNthDev(3), getNthDev(4)]
        };

        const devs = getDevs(10);
        const boards = getBoards(5);

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue(boards);
        localStorageService.getSticking.mockReturnValue([firstStickingPair, secondStickingPair]);

        rotatoValidato((results: Pair[]) => {
          expect(results).toHaveLength(5);
          expect(results).toSatisfyAll(pairHasTwoDevs);
          verifyPairsContainDevsAndBoards(results, devs, boards);

          // Helper function to check if a pair matches a sticking pair (devs and board)
          const isStickingPair = (pair: Pair, stickingPair: Pair) =>
            pair.board === stickingPair.board && arraysAreEqual(pair.devs, stickingPair.devs);

          const hasFirstStickingPair = results.some(pair => isStickingPair(pair, firstStickingPair));
          const hasSecondStickingPair = results.some(pair => isStickingPair(pair, secondStickingPair));

          expect(hasFirstStickingPair).toBe(true);
          expect(hasSecondStickingPair).toBe(true);

        }, (allResults: Pair[][]) => {
          const allResultsWithoutStickingPairs = allResults.map(results =>
            results.filter(x => x !== firstStickingPair && x !== secondStickingPair)
          );

          // verifyAllPairsAreUnique(allResultsWithoutStickingPairs);
        });
      });

      it('should not create empty pairs when there are more boards than devs', () => {
        const devs = getDevs(2);
        const boards = getBoards(3);

        localStorageService.getDevs.mockReturnValue(devs);
        localStorageService.getBoards.mockReturnValue(boards);

        rotatoValidato((results: Pair[]) => {
          expect(results).toHaveLength(1);
          expect(results[0].devs).toIncludeSameMembers(devs);
          expect(results[0].board).toBeOneOf(boards);
        }, (allResults: Pair[][]) => {
          const distinctBoards = new Set(allResults.map(results => results[0].board));
          expect(distinctBoards.size).toBeGreaterThan(1);
        });
      });

      describe('when there is an odd number of devs', () => {
        it('should make a pair of three devs when soloing is not enabled', () => {
          const devs = getDevs(5);
          const boards = getBoards(2);

          localStorageService.getDevs.mockReturnValue(devs);
          localStorageService.getBoards.mockReturnValue(boards);

          rotatoValidato((results: Pair[]) => {
            expect(results).toHaveLength(2);
            verifyPairsContainDevsAndBoards(results, devs, boards);

            const hasATriplePairAndDoublePair = (pairs: Pair[]) =>
              (pairs[0].devs.length === 3 && pairs[1].devs.length === 2) ||
              (pairs[0].devs.length === 2 && pairs[1].devs.length === 3);

            expect(results).toSatisfy(hasATriplePairAndDoublePair);
          }, (allResults: Pair[][]) => verifyAllPairsAreUnique(allResults));
        });

        it('should make a pair of one dev when soloing is enabled', () => {
          const devs = getDevs(5);
          const boards = getBoards(3);

          localStorageService.getDevs.mockReturnValue(devs);
          localStorageService.getBoards.mockReturnValue(boards);
          localStorageService.getAllowSolo.mockReturnValue(true);

          rotatoValidato((results: Pair[]) => {
            verifyPairsContainDevsAndBoards(results, devs, boards);

            const pairSizes = results.map(x => x.devs.length);
            expect(pairSizes).toIncludeSameMembers([2, 2, 1]);
          }, (allResults: Pair[][]) => verifyAllPairsAreUnique(allResults));
        });
      });

      describe('when there are carrying devs from previous rotation', () => {
        it('should keep carrying dev on the same board', () => {
          const carryingDev = getNthDev(1);
          const carryingBoard = getNthBoard(1);

          const previousPairs: Pair[] = [
            {board: carryingBoard, devs: [carryingDev, getNthDev(2)]},
            {board: getNthBoard(2), devs: [getNthDev(3), getNthDev(4)]}
          ]

          const devs = getDevs(6);
          const boards = getBoards(3);

          localStorageService.getDevs.mockReturnValue(devs);
          localStorageService.getBoards.mockReturnValue(boards);
          localStorageService.getCarriers.mockReturnValue([carryingDev]);
          localStorageService.getPairs.mockReturnValue(previousPairs);

          rotatoValidato((results: Pair[]) => {
            expect(results).toHaveLength(3);
            expect(results).toSatisfyAll(pairHasTwoDevs);
            verifyPairsContainDevsAndBoards(results, devs, boards);

            const carryingDevIsOnTheSameBoard = (pairs: Pair[]) =>
              (pairs[0].devs.includes(carryingDev) && pairs[0].board === carryingBoard) ||
              (pairs[1].devs.includes(carryingDev) && pairs[1].board === carryingBoard) ||
              (pairs[2].devs.includes(carryingDev) && pairs[2].board === carryingBoard);

            expect(results).toSatisfy(carryingDevIsOnTheSameBoard);
          }, (allResults: Pair[][]) => {
            const allDevsThatPairedWithCarryingDev = new Set(allResults.map(results =>
              results.filter(pair => pair.devs.includes(carryingDev))[0].devs
                .filter(dev => dev !== carryingDev)[0]
            ));
            expect(allDevsThatPairedWithCarryingDev.size).toBeGreaterThan(1);

            const allResultsWithoutCarryingPair = allResults.map(results => results.filter(pair => !pair.devs.includes(carryingDev)));
            verifyAllPairsAreUnique(allResultsWithoutCarryingPair);
          });
        });

        it('should keep carrying devs paired together when two devs are carrying one board', () => {
          const firstCarryingDev = getNthDev(1);
          const secondCarryingDev = getNthDev(2);
          const carryingBoard = getNthBoard(1);

          const carryingPair: Pair = {board: carryingBoard, devs: [firstCarryingDev, secondCarryingDev]};

          const previousPairs: Pair[] = [
            carryingPair,
            {board: getNthBoard(2), devs: [getNthDev(3), getNthDev(4)]}
          ]

          const devs = getDevs(6);
          const boards = getBoards(3);

          localStorageService.getDevs.mockReturnValue(devs);
          localStorageService.getBoards.mockReturnValue(boards);
          localStorageService.getCarriers.mockReturnValue([firstCarryingDev, secondCarryingDev]);
          localStorageService.getPairs.mockReturnValue(previousPairs);

          rotatoValidato((results: Pair[]) => {
            expect(results).toHaveLength(3);
            expect(results).toSatisfyAll(pairHasTwoDevs);
            verifyPairsContainDevsAndBoards(results, devs, boards);

            //checks board and devs
            const hasCarryingPair = results.some(pair =>
              pair.board === carryingPair.board &&
              arraysAreEqual(pair.devs, carryingPair.devs)
            );

            expect(hasCarryingPair).toBe(true);
          }, (allResults: Pair[][]) => {
            const allResultsWithoutCarryingPair = allResults.map(results =>
              results.filter(pair => pair == carryingPair)
            );
            verifyAllPairsAreUnique(allResultsWithoutCarryingPair);
          });
        });

        it('should put carrying pair on a new board when previous pair board is disabled', () => {
          const disabledCarryingBoard = getNthBoard(1);
          const firstOtherBoard = getNthBoard(2);
          const secondOtherBoard = getNthBoard(3);

          const carryingDev = getNthDev(1);

          const carryingPair: Pair = {board: disabledCarryingBoard, devs: [carryingDev, getNthDev(2)]};

          const devs = getDevs(2);

          const boards = [
            disabledCarryingBoard,
            firstOtherBoard,
            secondOtherBoard
          ]

          localStorageService.getDevs.mockReturnValue(devs);
          localStorageService.getBoards.mockReturnValue(boards);
          localStorageService.getCarriers.mockReturnValue([carryingDev]);
          localStorageService.getDisabledBoards.mockReturnValue([disabledCarryingBoard]);
          localStorageService.getPairs.mockReturnValue([carryingPair]);

          rotatoValidato((results: Pair[]) => {
            expect(results).toHaveLength(1);
            expect(results[0].devs).toIncludeSameMembers(devs);
            expect(results[0].board).toBeOneOf([firstOtherBoard, secondOtherBoard]);
          }, (allResults: Pair[][]) => {
            const distinctBoards = new Set(allResults.map(results => results[0].board));
            expect(distinctBoards.size).toBeGreaterThan(1);
          });
        });

        it('should ignore carrying devs when carrying devs are sticking from the previous rotation', () => {
          const stickingCarryingDev = getNthDev(1);
          const stickingPair: Pair = {board: undefined, devs: [stickingCarryingDev, getNthDev(2)]};

          const devs = getDevs(4);

          localStorageService.getDevs.mockReturnValue(devs);
          localStorageService.getBoards.mockReturnValue([]);
          localStorageService.getCarriers.mockReturnValue([stickingCarryingDev]);
          localStorageService.getSticking.mockReturnValue([stickingPair]);
          localStorageService.getPairs.mockReturnValue([stickingPair, {devs: [getNthDev(3), getNthDev(4)]}])

          const results = rotationService.makeItANewRotato();

          expect(results).toHaveLength(2);
          expect(results).toSatisfyAll(pairHasTwoDevs);
          verifyPairsContainDevsAndBoards(results, devs, [undefined, undefined]);

          //checks board and devs
          const hasStickingPair = results.some(pair =>
            pair.board === stickingPair.board &&
            arraysAreEqual(pair.devs, stickingPair.devs)
          );

          expect(hasStickingPair).toBe(true);
        });
      });
    });

    describe('when history is enabled', () => {
      const dev1 = 'dev1';// getNthDev(1);
      const dev2 = 'dev2';// getNthDev(2);
      const dev3 = 'dev3';// getNthDev(3);
      const dev4 = 'dev4';//getNthDev(4);
      const dev5 = 'dev5';//getNthDev(5);
      const dev6 = 'dev6';//getNthDev(6);
      const dev7 = 'dev7';//getNthDev(7);
      const dev8 = 'dev8';//getNthDev(8);
      const dev9 = 'dev9';//getNthDev(9);
      const dev10 = 'dev10';//getNthDev(10);
      const dev11 = 'dev11';//getNthDev(11);

      const board1 = getNthBoard(1);
      const board2 = getNthBoard(2);
      const board3 = getNthBoard(3);
      const board4 = getNthBoard(4);
      const board5 = getNthBoard(5);
      const board6 = getNthBoard(6);

      beforeEach(() => {
        localStorageService.getKeepHistory.mockReturnValue(true);
      });

      it.each([
        {
          name: 'Small Team Size: Yesterday\'s pairings shouldn\'t be picked today (3 days history)',
          teamSize: 4,
          historyDays: 5,
          history: [
            {
              date: getDateFromNDaysAgo(1),//yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3]},//solo
                {pairs: [dev4]},//solo
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev4, dev2]},
                {pairs: [dev1, dev3]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev3]},
                {pairs: [dev3, dev4]},
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 2,
          attempts: 10,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3}, // make sure wasn't picked to be solo again
            {dev1:dev4}, // make sure wasn't picked to be solo again
          ]
        },
        {
          name: 'Small Team Size: Yesterday\'s pairings shouldn\'t be picked today (1 day history)',
          teamSize: 4,
          historyDays: 3,
          history: [
            {
              date: getDateFromNDaysAgo(1), //yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3]},
                {pairs: [dev4]}
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 0,
          attempts: 10,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3},
            {dev1:dev4}
          ]
        },
        {
          name: 'Small Team Size: Multiple recent occurrences should be very rare',
          teamSize: 4,
          historyDays: 7,
          history: [
            {
              date: getDateFromNDaysAgo(1), //yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(4),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(5),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 1,
          attempts: 50,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3, dev2:dev4},
          ]
        },
        {
          name: 'Small Team Size: Long-term fairness - all developers should eventually pair with each other over time',
          teamSize: 4,
          historyDays: 10,
          history: [
            {
              date: getDateFromNDaysAgo(8),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(7),
              pairs: [
                {pairs: [dev1, dev4]},
                {pairs: [dev2, dev3]},
              ]
            },
            {
              date: getDateFromNDaysAgo(6),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(5),
              pairs: [
                {pairs: [dev1, dev4]},
                {pairs: [dev2, dev3]},
              ]
            },
            {
              date: getDateFromNDaysAgo(4),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev4]},
                {pairs: [dev2, dev3]},
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
              ]
            },
            {
              date: getDateFromNDaysAgo(1),
              pairs: [
                {pairs: [dev1, dev4]},
                {pairs: [dev2, dev3]},
              ]
            },
          ],
          assertionType: 'minOccurrences',
          expectedOccurrences: 10,
          attempts: 100, // More attempts to see distribution
          pairsToCheck: [
            { dev1: dev1, dev2: dev3},
            { dev1: dev2, dev2: dev4},
          ]
        },
        {
          name: 'Small Team Size: Sticking pairs should be maintained despite history',
          teamSize: 4,
          historyDays: 5,
          stickingPairs: [{board: board1, devs: [dev1, dev2]}],
          history: [
            {
              date: getDateFromNDaysAgo(1),
              pairs: [
                {pairs: [dev1, dev3]}, // Conflicts with sticking pair
                {pairs: [dev2, dev4]},
                {pairs: [dev5, dev6]},
              ]
            }
          ],
          assertionType: 'exactOccurrences',
          expectedOccurrences: 10,
          attempts: 10,
          pairsToCheck: [
            {dev1: dev1, dev2: dev2} // Sticking pair should always be present
          ]
        },
        {
          name: 'Small Team Size: Solo developers should rotate fairly based on history',
          teamSize: 4,
          historyDays: 7,
          allowSolo: true,
          history: [
            { date: getDateFromNDaysAgo(1), pairs: [{pairs: [dev1]}, {pairs: [dev2, dev3]}] },
            { date: getDateFromNDaysAgo(2), pairs: [{pairs: [dev4]}, {pairs: [dev1, dev5]}] },
            { date: getDateFromNDaysAgo(3), pairs: [{pairs: [dev2]}, {pairs: [dev6, dev3]}] },
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 1,
          attempts: 50,
          pairsToCheck: [ //Ensure dev1, dev4, dev2 isn't solo
            {dev1: dev1},
            {dev1: dev4},
            {dev1: dev2}
          ]
        },
        {
          name: 'Small Team Size: Malformed history data should not break algorithm',
          teamSize: 4,
          historyDays: 5,
          history: [
            { date: getDateFromNDaysAgo(1), pairs: [{pairs: [dev1]}] }, // Solo pair
            { date: getDateFromNDaysAgo(2), pairs: [{pairs: []}] }, // Empty pair
            { date: getDateFromNDaysAgo(3), pairs: [{pairs: [dev2, dev3, dev4]}] }, // Triple pair
            { date: 'invalid-date', pairs: [{pairs: [dev5, dev6]}] }, // Invalid date
          ],
          assertionType: 'minOccurrences',
          expectedOccurrences: 1,
          attempts: 25,
          pairsToCheck: [
            {dev1: dev1, dev2: dev2}
          ]
        },
        {
          name: 'Medium Team Size: Yesterday\'s pairings shouldn\'t be picked today (3 days history)',
          teamSize: 6,
          historyDays: 5,
          history: [
            {
              date: getDateFromNDaysAgo(1),//yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5]},//solo
                {pairs: [dev6]},//solo
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev3, dev2]},
                {pairs: [dev6, dev5]},
                {pairs: [dev4, dev1]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev3]},
                {pairs: [dev2, dev6]},
                {pairs: [dev4, dev5]},
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 2,
          attempts: 10,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3, dev2:dev4},
            {dev1:dev5}, // make sure wasn't picked to be solo again
            {dev1:dev6}, // make sure wasn't picked to be solo again
          ]
        },
        {
          name: 'Medium Team Size: Yesterday\'s pairings shouldn\'t be picked today (1 day history)',
          teamSize: 6,
          historyDays: 3,
          history: [
            {
              date: getDateFromNDaysAgo(1), //yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5]},
                {pairs: [dev6]}
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 0,
          attempts: 10,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3, dev2:dev4},
            {dev1:dev5},
            {dev1:dev6}
          ]
        },
        {
          name: 'Medium Team Size: Multiple recent occurrences should be very rare',
          teamSize: 6,
          historyDays: 7,
          history: [
            {
              date: getDateFromNDaysAgo(1), //yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(4),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(5),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev6, dev5]},
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 1,
          attempts: 20,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3, dev2:dev4},
            {dev1:dev5, dev2:dev6},
          ]
        },
        {
          name: 'Medium Team Size: Long-term fairness - all developers should eventually pair with each other over time',
          teamSize: 6,
          historyDays: 10,
          history: [
            {
              date: getDateFromNDaysAgo(8),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(7),
              pairs: [
                {pairs: [dev6, dev1]},
                {pairs: [dev5, dev2]},
                {pairs: [dev4, dev3]},
              ]
            },
            {
              date: getDateFromNDaysAgo(6),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(5),
              pairs: [
                {pairs: [dev6, dev1]},
                {pairs: [dev5, dev2]},
                {pairs: [dev4, dev3]},
              ]
            },
            {
              date: getDateFromNDaysAgo(4),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev6, dev1]},
                {pairs: [dev5, dev2]},
                {pairs: [dev4, dev3]},
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(1),
              pairs: [
                {pairs: [dev6, dev1]},
                {pairs: [dev5, dev2]},
                {pairs: [dev4, dev3]},
              ]
            },
          ],
          assertionType: 'minOccurrences',
          expectedOccurrences: 10,
          attempts: 100, // More attempts to see distribution
          pairsToCheck: [
            { dev1: dev1, dev2: dev5},
            { dev1: dev1, dev2: dev3},
            { dev1: dev1, dev2: dev4},
            { dev1: dev2, dev2: dev3},
            { dev1: dev2, dev2: dev4},
            { dev1: dev2, dev2: dev6},
            { dev1: dev3, dev2: dev1},
            { dev1: dev3, dev2: dev2},
            { dev1: dev3, dev2: dev5},
            { dev1: dev3, dev2: dev6},
          ]
        },
        {
          name: 'Medium Team Size: Sticking pairs should be maintained despite history',
          teamSize: 6,
          historyDays: 5,
          stickingPairs: [{board: board1, devs: [dev1, dev2]}],
          history: [
            {
              date: getDateFromNDaysAgo(1),
              pairs: [
                {pairs: [dev1, dev3]}, // Conflicts with sticking pair
                {pairs: [dev2, dev4]},
                {pairs: [dev5, dev6]},
              ]
            }
          ],
          assertionType: 'exactOccurrences',
          expectedOccurrences: 10,
          attempts: 10,
          pairsToCheck: [
            {dev1: dev1, dev2: dev2} // Sticking pair should always be present
          ]
        },
        {
          name: 'Medium Team Size: Solo developers should rotate fairly based on history',
          teamSize: 6,
          historyDays: 7,
          allowSolo: true,
          history: [
            { date: getDateFromNDaysAgo(1), pairs: [{pairs: [dev1]}, {pairs: [dev2, dev3]}] },
            { date: getDateFromNDaysAgo(2), pairs: [{pairs: [dev4]}, {pairs: [dev1, dev5]}] },
            { date: getDateFromNDaysAgo(3), pairs: [{pairs: [dev2]}, {pairs: [dev6, dev3]}] },
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 1,
          attempts: 50,
          pairsToCheck: [ //Ensure dev1, dev4, dev2 isn't solo
            {dev1: dev1},
            {dev1: dev4},
            {dev1: dev2}
          ]
        },
        {
          name: 'Medium Team Size: Malformed history data should not break algorithm',
          teamSize: 6,
          historyDays: 5,
          history: [
            { date: getDateFromNDaysAgo(1), pairs: [{pairs: [dev1]}] }, // Solo pair
            { date: getDateFromNDaysAgo(2), pairs: [{pairs: []}] }, // Empty pair
            { date: getDateFromNDaysAgo(3), pairs: [{pairs: [dev2, dev3, dev4]}] }, // Triple pair
            { date: 'invalid-date', pairs: [{pairs: [dev5, dev6]}] }, // Invalid date
          ],
          assertionType: 'minOccurrences',
          expectedOccurrences: 1,
          attempts: 25,
          pairsToCheck: [
            {dev1: dev1, dev2: dev2}
          ]
        },
        {
          name: 'Large Team Size: Yesterday\'s pairings shouldn\'t be picked today (3 days history)',
          teamSize: 11,
          historyDays: 5,
          history: [
            {
              date: getDateFromNDaysAgo(1),//yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
                {pairs: [dev9, dev8]},
                {pairs: [dev7]}, //solo
                {pairs: [dev10]}, //solo
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev3, dev2]},
                {pairs: [dev7, dev5]},
                {pairs: [dev4, dev1]},
                {pairs: [dev10, dev8]},
                {pairs: [dev6]}, //solo,
                {pairs: [dev9]}, //solo,
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev3]},
                {pairs: [dev2, dev6]},
                {pairs: [dev4, dev5]},
                {pairs: [dev7, dev10]},
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 2,
          attempts: 10,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3, dev2:dev4},
            {dev1:dev5, dev2:dev6},
            {dev1:dev9, dev2:dev8},
            {dev1:dev7}, // make sure dev7 wasn't picked to be solo again
            {dev1:dev10}, // make sure dev10 wasn't picked to be solo again
          ]
        },
        {
          name: 'Large Team Size: Yesterday\'s pairings shouldn\'t be picked today (1 days history)',
          teamSize: 11,
          historyDays: 3,
          history: [
            {
              date: getDateFromNDaysAgo(1), //yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5]}
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 2,
          attempts: 10,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3, dev2:dev4},
            {dev1:dev5}
          ]
        },
        {
          name: 'Large Team Size: Multiple recent occurrences should be very rare',
          teamSize: 11,
          historyDays: 7,
          history: [
            {
              date: getDateFromNDaysAgo(1), //yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
                {pairs: [dev8, dev7]},
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
                {pairs: [dev10, dev9]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev8, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(4),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev9, dev6]},
              ]
            },
            {
              date: getDateFromNDaysAgo(5),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev6, dev9]},
              ]
            }
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 2,
          attempts: 20,
          pairsToCheck: [
            {dev1:dev1, dev2:dev2},
            {dev1:dev3, dev2:dev4},
          ]
        },
        {
          name: 'Large Team Size: Long-term fairness - all developers should eventually pair with each other over time',
          teamSize: 11,
          historyDays: 10,
          history: [
            {
              date: getDateFromNDaysAgo(8),
              pairs: [
                {pairs: [dev1, dev10]},
                {pairs: [dev2, dev5]},
                {pairs: [dev3, dev7]},
                {pairs: [dev4, dev9]},
                {pairs: [dev6, dev8]},
                {pairs: [dev11]},
              ]
            },
            {
              date: getDateFromNDaysAgo(7),
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
                {pairs: [dev7, dev9]},
                {pairs: [dev11, dev10]},
              ]
            },
            {
              date: getDateFromNDaysAgo(6),
              pairs: [
                {pairs: [dev1, dev3]},
                {pairs: [dev2, dev4]},
                {pairs: [dev5, dev7]},
                {pairs: [dev6, dev8]},
                {pairs: [dev11, dev10]},
              ]
            },
            {
              date: getDateFromNDaysAgo(5),
              pairs: [
                {pairs: [dev1, dev4]},
                {pairs: [dev2, dev6]},
                {pairs: [dev3, dev8]},
                {pairs: [dev5, dev9]},
                {pairs: [dev11, dev10]},
              ]
            },
            {
              date: getDateFromNDaysAgo(4),
              pairs: [
                {pairs: [dev1, dev5]},
                {pairs: [dev2, dev7]},
                {pairs: [dev3, dev9]},
                {pairs: [dev4, dev8]},
                {pairs: [dev6, dev10]},
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev6]},
                {pairs: [dev2, dev8]},
                {pairs: [dev3, dev10]},
                {pairs: [dev4, dev9]},
                {pairs: [dev5, dev7]},
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev1, dev8]},
                {pairs: [dev2, dev10]},
                {pairs: [dev3, dev6]},
                {pairs: [dev4, dev7]},
                {pairs: [dev5, dev11]},
              ]
            },
            {
              date: getDateFromNDaysAgo(1),
              pairs: [
                {pairs: [dev1, dev9]},
                {pairs: [dev2, dev3]},
                {pairs: [dev4, dev5]},
                {pairs: [dev6, dev7]},
                {pairs: [dev8, dev10]},
              ]
            },
          ],
          assertionType: 'minOccurrences',
          expectedOccurrences: 40,
          attempts: 150, // More attempts to see distribution
          pairsToCheck: [
            { dev1: dev1, dev2: dev7},
            { dev1: dev2, dev2: dev9},
            { dev1: dev3, dev2: dev5},
          ]
        },
        {
          name: 'Large Team Size: Sticking pairs should be maintained despite history',
          teamSize: 11,
          historyDays: 5,
          stickingPairs: [{board: board1, devs: [dev1, dev2]}],
          history: [
            {
              date: getDateFromNDaysAgo(1),
              pairs: [
                {pairs: [dev1, dev3]}, // Conflicts with sticking pair
                {pairs: [dev2, dev4]},
                {pairs: [dev5, dev6]},
                {pairs: [dev7, dev8]},
                {pairs: [dev9, dev10]}
              ]
            }
          ],
          assertionType: 'exactOccurrences',
          expectedOccurrences: 10,
          attempts: 10,
          pairsToCheck: [
            {dev1: dev1, dev2: dev2} // Sticking pair should always be present
          ]
        },
        {
          name: 'Large Team Size: Solo developers should rotate fairly based on history',
          teamSize: 11,
          historyDays: 7,
          allowSolo: true,
          history: [
            { date: getDateFromNDaysAgo(1), pairs: [{pairs: [dev1]}, {pairs: [dev2, dev3]}] },
            { date: getDateFromNDaysAgo(2), pairs: [{pairs: [dev4]}, {pairs: [dev1, dev5]}] },
            { date: getDateFromNDaysAgo(3), pairs: [{pairs: [dev2]}, {pairs: [dev6, dev7]}] },
          ],
          assertionType: 'maxOccurrences',
          expectedOccurrences: 1,
          attempts: 50,
          pairsToCheck: [ //Ensure dev1, dev4, dev2 isn't solo
            {dev1: dev1},
            {dev1: dev4},
            {dev1: dev2}
          ]
        },
        {
          name: 'Large Team Size: Malformed history data should not break algorithm',
          teamSize: 11,
          historyDays: 5,
          history: [
            { date: getDateFromNDaysAgo(1), pairs: [{pairs: [dev1]}] }, // Solo pair
            { date: getDateFromNDaysAgo(2), pairs: [{pairs: []}] }, // Empty pair
            { date: getDateFromNDaysAgo(3), pairs: [{pairs: [dev2, dev3, dev4]}] }, // Triple pair
            { date: 'invalid-date', pairs: [{pairs: [dev5, dev6]}] }, // Invalid date
          ],
          assertionType: 'minOccurrences',
          expectedOccurrences: 1,
          attempts: 20,
          pairsToCheck: [
            {dev1: dev1, dev2: dev2}
          ]
        },
      ])('$name', ({teamSize, history, stickingPairs, historyDays, attempts, assertionType, expectedOccurrences, pairsToCheck}) => {
        localStorageService.getHistoryDays.mockReturnValue(historyDays);

        switch (teamSize) {
        case 6:
          localStorageService.getDevs.mockReturnValue([dev1, dev2, dev3, dev4, dev5, dev6]);
          localStorageService.getBoards.mockReturnValue([board1, board2, board3]);
          break;
        case 11:
          localStorageService.getDevs.mockReturnValue([dev1, dev2, dev3, dev4, dev5, dev6, dev7, dev8, dev9, dev10, dev11]);
          localStorageService.getBoards.mockReturnValue([board1, board2, board3, board4, board5, board6]);
          break;
        case 4:
          localStorageService.getDevs.mockReturnValue([dev1, dev2, dev3, dev4]);
          localStorageService.getBoards.mockReturnValue([board1, board2]);
          break;

        default:
          throw new Error(`Unsupported team size: ${teamSize}`);
        }

        localStorageService.getHistory.mockReturnValue(history);

        if (stickingPairs) {
          localStorageService.getSticking.mockReturnValue(stickingPairs);
        }

        //console.log(' ***** history **** ',  JSON.stringify(history, null, 2));
        //console.log(' *****  pairsToCheck ***** ', JSON.stringify(pairsToCheck, null, 2));

        const allResults: Pair[][] = [];
        for (let i = 0; i < attempts; i++) {
          const results = rotationService.makeItANewRotato();
          allResults.push(results);
        }


        // console.log(' *****  allResults ***** ', JSON.stringify(allResults, null, 2));

        pairsToCheck.forEach(({dev1, dev2}) => {
          const pairCount = allResults.filter(results =>
            results.some(pair =>
              pair.devs.includes(dev1) && pair.devs.includes(dev2)
            )
          ).length;

          switch (assertionType) {
          case 'maxOccurrences':
            expect(pairCount).toBeLessThanOrEqual(expectedOccurrences);
            console.log(`Pair ${dev1} and ${dev2} occurred ${pairCount} times, expected max ${expectedOccurrences}`);
            break;
          case 'minOccurrences':
            expect(pairCount).toBeGreaterThanOrEqual(expectedOccurrences);
            console.log(`Pair ${dev1} and ${dev2} occurred ${pairCount} times, expected min ${expectedOccurrences}`);
            break;
          case 'exactOccurrences':
            expect(pairCount).toBe(expectedOccurrences);
            console.log(`Pair ${dev1} and ${dev2} occurred exactly ${pairCount} times, expected ${expectedOccurrences}`);
            break;
          default:
            throw new Error(`Unknown assertion type: ${assertionType}`);
          }
        });
      });
    });

  });


  function getDateFromNDaysAgo(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function getNthDev(index: number): string {
    while (testDevData.length < index) {
      testDevData.push(faker.unique(faker.name.firstName));
    }
    return testDevData[index - 1];
  }

  function getNthBoard(index: number): string {
    while (testBoardData.length < index) {
      testBoardData.push(faker.unique(faker.name.firstName));
    }
    return testBoardData[index - 1];
  }

  function getDevs(size: number): string[] {
    while (testDevData.length < size) {
      testDevData.push(faker.unique(faker.name.firstName));
    }
    return testDevData.slice(0, size);
  }

  function getBoards(size: number): string[] {
    while (testBoardData.length < size) {
      testBoardData.push(faker.unique(faker.name.firstName));
    }
    return testBoardData.slice(0, size);
  }

  function rotatoValidato(
    expectations: { (results: Pair[]) },
    afterAllExpectations?: { (allResults: Pair[][]) }
  ): void {
    const numberOfTestRuns = 10;

    const allResults: Pair[][] = [];

    for (let x = 0; x < numberOfTestRuns; x++) {
      const results = rotationService.makeItANewRotato();
      expectations(results);
      allResults.push(results);
    }

    if (!!afterAllExpectations) {
      afterAllExpectations(allResults);
    }
  }
});

const pairHasTwoDevs = (pair: Pair) => pair.devs.length === 2;

function verifyPairsContainDevsAndBoards(pairs: Pair[], expectedDevs: string[], expectedBoards: string[]) {
  const devs = pairs.flatMap(pair => pair.devs);
  expect(devs).toIncludeSameMembers(expectedDevs);

  const boards = pairs.map(pair => pair.board);
  expect(boards).toIncludeSameMembers(expectedBoards);
}

function verifyAllPairsAreUnique(allPairs: Pair[][]): void {
  const allDevPairings = allPairs.map(results => results.map(pair => pair.devs));
  const repeatedDevPairsInEveryRotation = allDevPairings.reduce((x, y) => getIntersectionOfArrays(x, y));

  expect(repeatedDevPairsInEveryRotation).toHaveLength(0);

  const allDevAndBoardCombos = allPairs.map(results => results.flatMap(pair => pair.devs.map(dev => [dev, pair.board])));
  const repeatedDevAndBoardCombosInEveryRotation = allDevAndBoardCombos.reduce((x, y) => getIntersectionOfArrays(x, y));

  expect(repeatedDevAndBoardCombosInEveryRotation).toHaveLength(0);
}

function getIntersectionOfArrays(firstArrays: any[][], secondArrays: any[][]): any[][] {
  return firstArrays.filter(firstArray =>
    secondArrays.find(secondArray =>
      arraysAreEqual(firstArray, secondArray)
    )
  );
}
