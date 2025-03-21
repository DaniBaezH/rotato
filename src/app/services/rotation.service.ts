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

  getRotation(): PairsCombination {
    let devs = this.localStorageService.getDevs();
    let boards = this.localStorageService.getBoards();
    const disabled = this.localStorageService.getDisabled();
    const disabledBoards = this.localStorageService.getDisabledBoards();
    let sticking = this.localStorageService.getSticking();
    const history = this.localStorageService.getHistory();
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

    devs = devs.filter(dev => !disabled.includes(dev));// remove disabled devs
    devs = devs.filter(dev => !stickingDevs.includes(dev)); // remove devs that are sticking
    devs = devs.filter(dev => !carriersInRotation.includes(dev)); // remove devs that are carrying

    boards = boards.filter(board => !disabledBoards.includes(board)); // remove disabled boards
    boards = boards.filter(board => !stickingBoards.includes(board)); // remove boards that are sticking
    boards = boards.filter(board => !carryingBoardsInRotation.includes(board)); // remove boards that are carrying

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

    if (history.length > 1) {
      for (let i = 0; i < pairs.length; i++) {
        const currentPair = pairs[i];

        if (!currentPair.sticking) {
          const currentKey = currentPair.devs.slice().sort().join('-');

          let count = 0;
          let mostRecentIndex = 0;

          for (let j = 0; j < history.length; j++) {
            const record = history[j];

            for (const pastPair of record.pairs) {
              const pastKey = pastPair.devs.slice().sort().join('-');
              if (pastKey === currentKey) {
                count++;
                mostRecentIndex = j;
              }
            }
          }

          currentPair.recurrences = count;
          currentPair.daysSinceLastRecurrence = mostRecentIndex;

        }
      }
    }

    let score = 0;
    for (const pair of pairs) {
      score += pair.recurrences - pair.daysSinceLastRecurrence;
    }

    let comb: PairsCombination = {pairs: pairs, score: score};

    console.log(comb);

    return comb;
  }

  makeItRotato(): Pair[] {

    let pairCombinations: PairsCombination[] = [];

    for (let i: number = 0; i < 100; i++) {
      pairCombinations.push(this.getRotation());
    }

    //find pair combination with the lowest score
    let bestCombination: PairsCombination;

    let bestScore: number = 0;

    for (const combination of pairCombinations) {
      if (!bestCombination || combination.score < bestScore) {
        bestCombination = combination;
        bestScore = combination.score;
      }
    }

    console.log("Best combination score: " + bestCombination.score);
    console.log(bestCombination.pairs);

    return bestCombination.pairs;
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
