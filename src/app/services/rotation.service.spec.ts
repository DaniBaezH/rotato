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

    describe('when history is enabled and not empty', () => {
      const dev1 = getNthDev(1);
      const dev2 = getNthDev(2);
      const dev3 = getNthDev(3);
      const dev4 = getNthDev(4);
      const dev5 = getNthDev(5);
      const dev6 = getNthDev(6);
      const dev7 = getNthDev(7);

      const board1 = getNthBoard(1);
      const board2 = getNthBoard(2);
      const board3 = getNthBoard(3);
      const board4 = getNthBoard(4);

      beforeEach(() => {
        localStorageService.getKeepHistory.mockReturnValue(true);
        localStorageService.getDevs.mockReturnValue([dev1, dev2, dev3, dev4, dev5, dev6, dev7]);
        localStorageService.getBoards.mockReturnValue([board1, board2, board3, board4]);
      });

      function getDateFromNDaysAgo(daysAgo: number): string {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      }

      it.each([
        {
          name: '2 days history - yesterdays pairings shouldnt be picked today (tolerance up to 2 in 10 attempts)',
          historyDays: 5,
          history: [
            {
              date: getDateFromNDaysAgo(1),//yesterday
              pairs: [
                {pairs: [dev1, dev2]},
                {pairs: [dev3, dev4]},
                {pairs: [dev5, dev6]},
                {pairs: [dev7]}, //solo
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev3, dev2]},
                {pairs: [dev7, dev5]},
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
          expectedMaxOccurrences: 2,
          attempts: 10,
          pairsToCheck: [
            {dev1, dev2},
            {dev3, dev4},
            {dev5, dev6},
            {dev7} // make sure dev7 wasn't picked to be solo again
          ]
        },
        {
          name: '1 day history - yesterdays pairings shouldnt be picked today (tolerance up to 2 in 10 attempts)',
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
          expectedMaxOccurrences: 2,
          attempts: 10,
          pairsToCheck: [
            {dev1, dev2},
            {dev3, dev4},
            {dev5}
          ]
        },
        {
          name: '4 day history - multiple recent occurrences should be very rare (tolerance up to 2 in 10 attempts)',
          historyDays: 7,
          history: [
            {
              date: getDateFromNDaysAgo(1), //today
              pairs: [
                {pairs: [dev1, dev2]}
              ]
            },
            {
              date: getDateFromNDaysAgo(2),
              pairs: [
                {pairs: [dev1, dev2]}
              ]
            },
            {
              date: getDateFromNDaysAgo(3),
              pairs: [
                {pairs: [dev1, dev2]}
              ]
            },
            {
              date: getDateFromNDaysAgo(4),
              pairs: [
                {pairs: [dev1, dev2]}
              ]
            }
          ],
          expectedMaxOccurrences: 2,
          attempts: 10,
          pairsToCheck: [
            {dev1, dev2}
          ]
        },
      ])('$name', ({history, historyDays, attempts, expectedMaxOccurrences, pairsToCheck}) => {
        localStorageService.getHistoryDays.mockReturnValue(historyDays);
        localStorageService.getHistory.mockReturnValue(history);

        //console.log(' ***** history **** ',  JSON.stringify(history, null, 2));
        console.log(' *****  pairsToCheck ***** ', JSON.stringify(pairsToCheck, null, 2));

        const allResults: Pair[][] = [];
        for (let i = 0; i < attempts; i++) {
          const results = rotationService.makeItANewRotato();
          allResults.push(results);
        }

        console.log(' *****  allResults ***** ', JSON.stringify(allResults, null, 2));

        pairsToCheck.forEach(({dev1, dev2}) => {
          const pairCount = allResults.filter(results =>
            results.some(pair =>
              pair.devs.includes(dev1) && pair.devs.includes(dev2)
            )
          ).length;

          expect(pairCount).toBeLessThanOrEqual(expectedMaxOccurrences);
        });
      });
    });
    // describe('when dev history is enabled and not empty', () => {

    //   beforeEach(() => {
    //     localStorageService.getKeepHistory.mockReturnValue(true);
    //   });

    // it.each([
    //   {
    //     name: '5 days',
    //     daysHistory: 5,
    //     iterations: 5,
    //     expectedMaxOccurrences: 1,
    //   },
    //   {
    //     name: '7 days',
    //     daysHistory: 7,
    //     iterations: 7,
    //     expectedMaxOccurrences: 2,
    //   },
    //   {
    //     name: '10 days',
    //     daysHistory: 10,
    //     iterations: 10,
    //     expectedMaxOccurrences: 3,
    //   }
    // ])
    // ('should prefer pairings that haven\'t occurred recently', () => {
    //   const dev1 = getNthDev(1);
    //   const dev2 = getNthDev(2);
    //   const dev3 = getNthDev(3);
    //   const dev4 = getNthDev(4);
    //   const dev5 = getNthDev(5);
    //   const dev6 = getNthDev(6);

    //   const board1 = getNthBoard(1);
    //   const board2 = getNthBoard(2);
    //   const board3 = getNthBoard(3);

    //   const history = [
    //     {
    //       date: '2024-03-19',
    //       pairs: [
    //         { pairs: [dev1, dev2] },
    //         { pairs: [dev3, dev4] },
    //         { pairs: [dev5, dev6] }
    //       ]
    //     },
    //     {
    //       date: '2024-03-18',
    //       pairs: [
    //         { pairs: [dev1, dev3] },
    //         { pairs: [dev2, dev4] },
    //         { pairs: [dev5, dev6] }
    //       ]
    //     }
    //   ];

    //   localStorageService.getDevs.mockReturnValue([dev1, dev2, dev3, dev4, dev5, dev6]);
    //   localStorageService.getBoards.mockReturnValue([board1, board2, board3]);
    //   localStorageService.getHistory.mockReturnValue(history);

    //   const numberOfTestRuns = 10;

    //   // Run multiple iterations to verify the pattern
    //   const allResults: Pair[][] = [];
    //   for (let i = 0; i < numberOfTestRuns; i++) {
    //     const results = rotationService.makeItANewRotato();
    //     allResults.push(results);
    //   }

    //   // Verify that dev1-dev2 and dev3-dev4 pairings are less common
    //   const dev1Dev2Count = allResults.filter(results =>
    //     results.some(pair =>
    //       pair.devs.includes(dev1) && pair.devs.includes(dev2)
    //     )
    //   ).length;

    //   const dev3Dev4Count = allResults.filter(results =>
    //     results.some(pair =>
    //       pair.devs.includes(dev3) && pair.devs.includes(dev4)
    //     )
    //   ).length;

    //   // These pairings should be less common than others
    //   console.log(dev1Dev2Count*100/numberOfTestRuns);
    //   console.log(dev3Dev4Count);
    //   expect(dev1Dev2Count).toBeLessThan(2); // Less than 20% chance of repeating
    //   expect(dev3Dev4Count).toBeLessThan(2); // Less than 20% chance of repeating
    // });

    // it('should prefer pairings that haven\'t occurred at all', () => {
    //   // Set up history with some pairings
    //   const history = [
    //     {
    //       date: '2024-03-19',
    //       pairs: [
    //         { pairs: [dev1, dev2] },
    //         { pairs: [dev3, dev4] },
    //         { pairs: [dev5, dev6] }
    //       ]
    //     }
    //   ];

    //   localStorageService.getHistory.mockReturnValue(history);

    //   // Run multiple iterations
    //   const allResults: Pair[][] = [];
    //   for (let i = 0; i < 10; i++) {
    //     const results = rotationService.makeItANewRotato();
    //     allResults.push(results);
    //   }

    //   // Verify that dev1-dev3 and dev2-dev4 pairings are more common
    //   const dev1Dev3Count = allResults.filter(results =>
    //     results.some(pair =>
    //       pair.devs.includes(dev1) && pair.devs.includes(dev3)
    //     )
    //   ).length;

    //   const dev2Dev4Count = allResults.filter(results =>
    //     results.some(pair =>
    //       pair.devs.includes(dev2) && pair.devs.includes(dev4)
    //     )
    //   ).length;

    //   // These pairings should be more common
    //   expect(dev1Dev3Count).toBeGreaterThan(5); // More than half the time
    //   expect(dev2Dev4Count).toBeGreaterThan(5); // More than half the time
    // });

    // it('should handle team size scaling in scoring', () => {
    //   // Test with a small team (4 devs)
    //   const smallTeam = [dev1, dev2, dev3, dev4];
    //   localStorageService.getDevs.mockReturnValue(smallTeam);

    //   const history = [
    //     {
    //       date: '2024-03-19',
    //       pairs: [
    //         { pairs: [dev1, dev2] },
    //         { pairs: [dev3, dev4] }
    //       ]
    //     }
    //   ];

    //   localStorageService.getHistory.mockReturnValue(history);

    //   const smallTeamResults = rotationService.makeItANewRotato();

    //   // Test with a larger team (6 devs)
    //   const largeTeam = [dev1, dev2, dev3, dev4, dev5, dev6];
    //   localStorageService.getDevs.mockReturnValue(largeTeam);

    //   const largeTeamResults = rotationService.makeItANewRotato();

    //   // The scoring should be different based on team size
    //   // For small teams, we expect more weight on days since last pairing
    //   // For large teams, we expect more weight on recurrence count
    //   expect(smallTeamResults).not.toEqual(largeTeamResults);
    // });

    // it('should respect sticking pairs even when optimizing for history', () => {
    //   const stickingPair: Pair = {
    //     board: board1,
    //     devs: [dev1, dev2],
    //     sticking: true
    //   };

    //   localStorageService.getSticking.mockReturnValue([stickingPair]);

    //   const history = [
    //     {
    //       date: '2024-03-19',
    //       pairs: [
    //         { pairs: [dev1, dev3] }, // This pairing should be ignored due to sticking
    //         { pairs: [dev2, dev4] },
    //         { pairs: [dev5, dev6] }
    //       ]
    //     }
    //   ];

    //   localStorageService.getHistory.mockReturnValue(history);

    //   const results = rotationService.makeItANewRotato();

    //   // Verify sticking pair is maintained
    //   expect(results).toContainEqual(stickingPair);

    //   // Verify other pairs are optimized based on history
    //   const otherPairs = results.filter(pair => !pair.sticking);
    //   expect(otherPairs).toHaveLength(2);
    // });
    //});

  });


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
