import {Injectable} from '@angular/core';
import {LocalStorageService} from './local-storage.service';
import {Pair, PairsCombination} from '../utillity/pair';
import {shuffle} from '../utillity/lulz';

@Injectable({
  providedIn: 'root'
})
export class RotationService {

  constructor(
    private localStorageService: LocalStorageService,
  ) {
  }

  makeItRotato(): PairsCombination {
    let devs = this.localStorageService.getDevs();
    let boards = this.localStorageService.getBoards();
    const disabled = this.localStorageService.getDisabled();
    const disabledBoards = this.localStorageService.getDisabledBoards();
    let sticking = this.localStorageService.getSticking();

    let carryingPairs = this.getCarryingPairs();

    const stickingBoards = sticking.map(pair => pair.board);
    const stickingDevs = sticking.flatMap(pair => pair.devs);
    const carriersInRotation = carryingPairs.flatMap(pair => pair.devs);
    const carryingBoardsInRotation = carryingPairs.map(pair => pair.board);

    let pairs: Pair[] = sticking.map(pair => ({
      ...pair,
      sticking: true,
      recurrences: 0,
      daysSinceLastRecurrence: 0,
    }));

    devs = devs.filter(dev => !disabled.includes(dev));
    devs = devs.filter(dev => !stickingDevs.includes(dev));
    devs = devs.filter(dev => !carriersInRotation.includes(dev));

    boards = boards.filter(board => !disabledBoards.includes(board));
    boards = boards.filter(board => !stickingBoards.includes(board));
    boards = boards.filter(board => !carryingBoardsInRotation.includes(board));

    carryingPairs = carryingPairs.filter(carryingPair =>
      stickingDevs.findIndex(dev => carryingPair.devs.includes(dev)) < 0
    );// remove devs that are sticking

    shuffle(carryingPairs);
    shuffle(boards);
    shuffle(devs);

    for (const pair of carryingPairs) {
      if (pair.devs.length < 2) {
        const dev = pair.devs[0];
        const partner = devs.splice(0, 1)[0];

        let board = pair.board;
        if (!board || disabledBoards.includes(board)) {
          board = boards.pop();
        }

        pairs.push(
          {
            board: board,
            devs:
              [dev, partner].filter(x => !!x)
          }
        );
      } else {
        pairs.push(pair);
      }
    }

    let solo: string;
    if (devs.length % 2 !== 0) {
      if (this.localStorageService.getAllowSolo()) {
        devs.push(null);
      } else {
        solo = devs.pop();
      }
    }

    for (let i = 0; i < devs.length / 2; i++) {
      const firstIndex = i * 2;
      const secondIndex = firstIndex + 1;
      const pair: string[] = [devs[firstIndex]];
      const partner = devs[secondIndex];
      if (partner) {
        pair.push(partner);
      }
      pairs.push(
        {
          board: boards.pop(),
          devs: pair
        }
      );
    }

    if (!this.localStorageService.getAllowSolo() && solo){
      pairs[0].devs.push(solo);
    }

    return {pairs: pairs, score: this.scoreCombination(pairs)};
  }

  makeItANewRotato(): Pair[] {

    if (!this.localStorageService.getKeepHistory() || this.localStorageService.getHistory().length === 0) {
      return this.makeItRotato().pairs;
    }

    let pairCombinations: PairsCombination[] = [];

    for (let i: number = 0; i < this.getNumberOfIterations(); i++) {
      pairCombinations.push(this.makeItRotato());
    }

    return this.getBestCombination(pairCombinations);
  }

  private getBestCombination(pairCombinations: PairsCombination[]): Pair[] {
    let bestCombination: PairsCombination;
    let bestScore: number = 0;

    for (const combination of pairCombinations) {
      if (!bestCombination || combination.score < bestScore) {
        bestCombination = combination;
        bestScore = combination.score;
      }
    }

    return bestCombination.pairs;
  }

  // Calculate number of iterations based on team size
  private getNumberOfIterations(): number {
    const baseDevs = this.localStorageService.getDevs().length;
    return Math.min(Math.max(50, baseDevs * 15), 200);

    /*
    Minimum: 50 iterations (ensures good coverage for small teams)
    Scaling: 15 iterations per developer
    Maximum: 200 iterations
      4 developers: 60 iterations
      5 developers: 75 iterations
      6 developers: 90 iterations
      7 developers: 105 iterations
      8 developers: 120 iterations
      9 developers: 135 iterations
      10 developers: 150 iterations
      11 developers: 165 iterations
      12 developers: 180 iterations
      13 developers: 195 iterations
      14+ developers: 200 iterations
    */
  }

  private scoreCombination(pairs: Pair[]): number {
    let score = 0;
    const history = this.localStorageService.getHistory();
    const today = new Date();
    const teamSize = pairs.length;  // Number of pairs in the team

    // Scale factors based on team size
    const recurrenceWeight = teamSize <= 2 ? 2 : 3;  // Less penalty for small teams
    const daysWeight = teamSize <= 2 ? 3 : 2;        // More weight on days for small teams
    const defaultDays = teamSize * 5;                // Scales with team size

    for (let i = 0; i < pairs.length; i++) {
      const currentPair = pairs[i];

      if (!currentPair.sticking) {
        const currentKey = currentPair.devs.slice().sort().join('-');
        let count = 0;
        let lastPairingDate: Date | null = null;

        for (let j = 0; j < history.length; j++) {
          const record = history[j];
          for (const pastPair of record.pairs) {
            const pastKey = pastPair.devs.slice().sort().join('-');
            if (pastKey === currentKey) {
              count++;
              // Keep track of the most recent pairing date
              const recordDate = new Date(record.date.toString());
              if (!lastPairingDate || recordDate > lastPairingDate) {
                lastPairingDate = recordDate;
              }
            }
          }
        }

        currentPair.recurrences = count * 2;

        // Calculate days since last pairing
        if (lastPairingDate) {
          const diffTime = Math.abs(today.getTime() - lastPairingDate.getTime());
          currentPair.daysSinceLastRecurrence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
          // If never paired before, scale with team size
          currentPair.daysSinceLastRecurrence = defaultDays;
        }
      } else {
        currentPair.recurrences = 0;
        currentPair.daysSinceLastRecurrence = 0;
      }
    }

    // Calculate final score with team-size-adjusted weights
    for (const pair of pairs) {
      // For small teams: less penalty for recurrences, more weight on days
      // For larger teams: more penalty for recurrences, normal weight on days
      score += (pair.recurrences * recurrenceWeight) - (pair.daysSinceLastRecurrence * daysWeight);
    }

    return score;
  }

  private getCarryingPairs(): Pair[] {
    const carriers = this.localStorageService.getCarriers();

    const carryingPairsFromPreviousRotation = this.localStorageService.getPairs()
      .filter(pair => carriers.findIndex(carrier => pair.devs.includes(carrier)) >= 0)
      .map(pair => <Pair>{board: pair.board, devs: pair.devs.filter(dev => carriers.includes(dev))});

    const remainingCarriers = carriers.filter(carrier => !carryingPairsFromPreviousRotation.flatMap(pair => pair.devs).includes(carrier))
      .map(carrier => <Pair>{board: undefined, devs: [carrier]});

    return carryingPairsFromPreviousRotation.concat(remainingCarriers);
  }
}
