import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
} from "@nextui-org/react";

export default function Leaderboard({ scores }) {
  const sortedData = scores.sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-[unset] flex-grow-0 w-full 2xl:w-auto mx-auto px-0 2xl:px-4">
      <h1 className="text-2xl flex md:hidden font-bold mb-4 text-center">
        Leaderboard
      </h1>
      <Table
        aria-label="Leaderboard table"
        title="Leaderboard"
        content="Leaderboard"
      >
        <TableHeader>
          <TableColumn>RANK</TableColumn>
          <TableColumn>PLAYER</TableColumn>
          <TableColumn>SCORE</TableColumn>
        </TableHeader>
        <TableBody>
          {sortedData.map((player, index) => (
            <TableRow key={player.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <User
                  name={player.name}
                  /* description={player.user} */
                  avatarProps={{
                    src: "/defprofile.svg",
                    size: "sm",
                  }}
                ></User>
              </TableCell>
              <TableCell className="flex flex-row items-center justify-center">
                {player.score}{" "}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
